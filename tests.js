var OpenTI = require('./openti.js');

/*
 * To add a test, just add it to the tests object. The test context
 * works like this:

test.stage([ memory contents ], { initial register values }, { initial flag values });
test.execute(cycles);
test.assert({ expected register values }, { expected flag values }, { expected cycles });

 * The only required parameter in all of these is the memory contents of test.stage.
 * Everything else uses sane defaults, or omits that value from the test.
 *
 * Please make an effort to test all relevant registers, flags, and expected cycles.
 */

var tests = {
    'ADD A, r': function(test) {
        test.stage([ 0x80 /* ADD A, B */ ], { A: 10, B: 20 });
        test.execute();
        test.assert({ A: 30 }, { Z: 0, C: 0 }, 4);

        test.stage([ 0x80 /* ADD A, B */ ], { A: 0xF0, B: 0x20 });
        test.execute();
        test.assert({ A: 0x10 }, { Z: 0, C: 1 }, 4);

        test.stage([ 0x86 /* ADD A, (HL) */ ], { A: 0, HL: 0xC000 });
        test.calc.mmu.forceWrite(0xC000, 10);
        test.execute();
        test.assert({ A: 10 }, { Z: 0, C: 0 }, 7);
    },
    'ADC A, r': function(test) {
        test.stage([ 0x88 /* ADC A, B */ ], { A: 10, B: 20 }, { C: 0 });
        test.execute();
        test.assert({ A: 30 }, { Z: 0, C: 0 }, 4);

        test.stage([ 0x88 /* ADC A, B */ ], { A: 10, B: 20 }, { C: 1 });
        test.execute();
        test.assert({ A: 31 }, { Z: 0, C: 0 }, 4);

        test.stage([ 0x88 /* ADC A, B */ ], { A: 0xFF, B: 0 }, { C: 1 });
        test.execute();
        test.assert({ A: 0 }, { Z: 1, C: 1 }, 4);
    },
    'SUB A, r': function(test) {
        test.stage([ 0x90 /* SUB A, B */ ], { A: 0x10, B: 0x20 });
        test.execute();
        test.assert({ A: 0xF0 }, { Z: 0, C: 1 }, 4);

        test.stage([ 0x90 /* SUB A, B */ ], { A: 20, B: 10 });
        test.execute();
        test.assert({ A: 10 }, { Z: 0, C: 0 }, 4);
    },
    'SBC A, r': function(test) {
        test.stage([ 0x98 /* SBC A, B */ ], { A: 20, B: 10 }, { C: 0 });
        test.execute();
        test.assert({ A: 10 }, { Z: 0, C: 0 }, 4);

        test.stage([ 0x98 /* SBC A, B */ ], { A: 20, B: 10 }, { C: 1 });
        test.execute();
        test.assert({ A: 9 }, { Z: 0, C: 0 }, 4);

        test.stage([ 0x98 /* SBC A, B */ ], { A: 1, B: 1 }, { C: 1 });
        test.execute();
        test.assert({ A: 0xFF }, { Z: 0, C: 1 }, 4);

        test.stage([ 0x98 /* SBC A, B */ ], { A: 1, B: 1 }, { C: 0 });
        test.execute();
        test.assert({ A: 0 }, { Z: 1, C: 0 }, 4);
    },
    'AND A, r': function(test) {
        test.stage([ 0xA0 /* AND A, B */ ], { A: 0xFF, B: 0xF0 });
        test.execute();
        test.assert({ A: 0xF0 }, {}, 4);
    },
    'XOR A, r': function(test) {
        test.stage([ 0xA8 /* XOR A, B */ ], { A: 0xFF, B: 0xF0 });
        test.execute();
        test.assert({ A: 0x0F }, {}, 4);
    },
    'OR A, r': function(test) {
        test.stage([ 0xB0 /* OR A, B */ ], { A: 0x00, B: 0xF0 });
        test.execute();
        test.assert({ A: 0xF0 }, {}, 4);
    },
    'CP A, r': function(test) {
        test.stage([ 0xB8 /* CP B */ ], { A: 0, B: 10 });
        test.execute();
        test.assert({ A: 0, B: 10 }, { Z: 0, C: 1 }, 4);
    }
};

function createTestContext() {
    return {
        calc: new OpenTI.TI83p(),
        cycles: 0,
        stage: function(code, registers, flags) {
            this.reset();
            for (var i = 0; i < code.length; i++) {
                this.calc.mmu.forceWrite(i, code[i]);
            }
            if (typeof registers !== 'undefined') {
                for (var r in registers) {
                    this.calc.cpu.registers[r] = registers[r];
                }
            }
            if (typeof flags !== 'undefined') {
                for (var f in flags) {
                    this.calc.cpu.registers.flags[f] = flags[f];
                }
            }
        },
        assert: function(registers, flags, cycles) {
            for (var r in registers) {
                if (registers[r] != this.calc.cpu.registers[r]) {
                    throw new Error('Expected register ' + r + ' to be ' + registers[r] + ', was actually ' + this.calc.cpu.registers[r]);
                }
            }
            if (typeof flags !== 'undefined') {
                for (var f in flags) {
                    if (flags[f] != this.calc.cpu.registers.flags[f]) {
                        throw new Error('Expected flag ' + f + ' to be ' + flags[f] + ', was actually ' + this.calc.cpu.registers.flags[f]);
                    }
                }
            }
            if (typeof cycles !== 'undefined') {
                if (cycles != this.cycles) {
                    throw new Error('Expected cycles to be ' + cycles + ', was actually ' + this.cycles);
                }
            }
        },
        reset: function() {
            this.calc = new OpenTI.TI83p();
            this.cycles = 0;
        },
        execute: function(cycles) {
            var result = this.calc.cpu.execute(typeof cycles === 'undefined' ? 1 : cycles);
            result -= typeof cycles === 'undefined' ? 1 : cycles;
            this.cycles = -result;
        }
    };
}

var passed = []; var failed = [];
for (var test in tests) {
    var context = createTestContext();
    process.stdout.write('Testing "' + test + '"');
    try {
        tests[test](context, context.calc);
        console.log(': PASS');
        passed.push(test);
    } catch (m) {
        if (typeof m.type === 'undefined') {
            console.log(': FAIL (' + m + ')');
            console.log(m.stack);
            failed.push(test);
        } else {
            throw m;
        }
    }
}
console.log(passed.length + ' tests passed.');
console.log(failed.length + ' tests failed.');
