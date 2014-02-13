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
    'performance': function(test) {
        var calc = new OpenTI.TI83p();
        var start = new Date();
        calc.execute(100000); // RST 0x38 a bunch of times
        var end = new Date();
        console.log('Executed 100,000 cycles in ' + (end - start) + ' milliseconds.');
        return false;
    },
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
    },
    'NOP': function(test) {
        // Not sure this is really important, but whatever
        // Maybe we can extend it later to test all the psuedo-NOPs
        test.stage([ 0x00 /* NOP */ ]);
        test.execute();
        test.assert({}, {}, 4);
    },
    'EX AF, AF\'': function(test) {
        test.stage([ 0x08 /* EX AF, AF' */ ], { AF: 0x1234, _af: 0x4321 });
        test.execute();
        test.assert({ AF: 0x4321, _af: 0x1234 }, {}, 4);
    },
    'DJNZ d': function(test) {
        test.stage([ 0x10, 0xFE /* DJNZ $ */ ], { B: 10 });
        test.execute();
        test.assert({ B: 9, PC: 0 }, {}, 13);
        while (test.calc.cpu.registers.B != 1) {
            test.execute();
        }
        test.resetCycles();
        test.assert({ B: 1, PC: 0 });
        test.execute();
        test.assert({ B: 0, PC: 2 }, {}, 8);
    },
    'JR d': function(test) {
        test.stage([ 0x18, 0x08 /* JR 10 */ ]);
        test.execute();
        test.assert({ PC: 10 }, {}, 12);
    },
    'JR cc, d': function(test) {
        test.stage([ 0x20, 0x08 /* JR nz, 10 */ ], {}, { Z: 0 });
        test.execute();
        test.assert({ PC: 10 }, {}, 12);

        test.stage([ 0x28, 0x08 /* JR z, 10 */ ], {}, { Z: 0 });
        test.execute();
        test.assert({ PC: 2 }, {}, 7);

        test.stage([ 0x30, 0x08 /* JR nc, 10 */ ], {}, { C: 1 });
        test.execute();
        test.assert({ PC: 2 }, {}, 7);

        test.stage([ 0x38, 0x08 /* JR c, 10 */ ], {}, { C: 1 });
        test.execute();
        test.assert({ PC: 10 }, {}, 12);
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
        resetCycles: function() {
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
var minWidth = 30;

function runTest(test) {
    var context = createTestContext();
    var length = test.length + 'Testing '.length;
    process.stdout.write('Testing ' + test + ' ');
    while (length < minWidth) {
        process.stdout.write('.');
        length++;
    }
    try {
        var result = tests[test](context, context.calc);
        if (typeof result === 'undefined' || result) {
            console.log('PASS');
        }
        passed.push(test);
    } catch (m) {
        if (typeof m.type === 'undefined') {
            console.log('FAIL');
            console.log(m.stack);
            failed.push(test);
        } else {
            throw m;
        }
    }
}

if (process.argv.length == 2) {
    for (var test in tests) {
        runTest(test);
    }
} else {
    process.argv.slice(2).forEach(function(test) {
        if (test === '--list') {
            for (var test in tests) {
                console.log(test);
            }
            process.exit(0);
        } else if (typeof tests[test] === 'undefined') {
            process.stderr.write('Error: test "' + test + '" not found.\n');
            process.exit(1);
        } else {
            runTest(test);
        }
    });
}
console.log(passed.length + ' tests passed.');
console.log(failed.length + ' tests failed.');
process.exit(failed.length);
