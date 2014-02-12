var OpenTI = require('./openti.js');

var tests = {
    'ADD A, n': function(test) {
        test.stage([ 0x80 ], { A: 10, B: 20 });
        test.execute();
        test.assert({ A: 30, B: 20 }, { Z: 0, C: 0 });

        test.stage([ 0x80 ], { A: 0xF0, B: 0x20 });
        test.execute();
        test.assert({ A: 0x10, B: 0x20 }, { Z: 0, C: 1 });

        test.stage([ 0x80 ], { A: 0xF0, B: 0x10 });
        test.execute();
        test.assert({ A: 0, B: 0x10 }, { Z: 1, C: 1 });
    }
};

function createTestContext() {
    return {
        calc: new OpenTI.TI83p(),
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
        assert: function(registers, flags) {
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
        },
        reset: function() {
            this.calc = new OpenTI.TI83p();
        },
        execute: function() {
            this.calc.cpu.execute(1);
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
