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
    'ADD A, n': function(test) {
        test.stage([ 0x80 /* ADD A, B */ ], { A: 10, B: 20 });
        test.execute();
        test.assert({ A: 30, B: 20 }, { Z: 0, C: 0 }, 4);

        test.stage([ 0x80 /* ADD A, B */ ], { A: 0xF0, B: 0x20 });
        test.execute();
        test.assert({ A: 0x10, B: 0x20 }, { Z: 0, C: 1 }, 4);

        test.stage([ 0x86 /* ADD A, (HL) */ ], { A: 0, HL: 0xC000 });
        test.calc.mmu.forceWrite(0xC000, 10);
        test.execute();
        test.assert({ A: 10 }, { Z: 0, C: 0 }, 7);
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

for (var test in tests) {
    var context = createTestContext();
    var passed = [];
    var failed = [];
    process.stdout.write('Running test "' + test + '"');
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
    console.log(passed.length + ' tests passed.');
    console.log(failed.length + ' tests failed.');
}
