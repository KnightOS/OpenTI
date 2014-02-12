# OpenTI

An emulator for calculators with [KnightOS](https://github.com/KnightSoft/KnightOS) support. Namely:

* TI-73
* TI-83+
* TI-83+ SE
* TI-84+
* TI-84+ SE
* TI-84+ CSE

And all the variations on that theme. This is just a library, it's up to you to use it.

This software is not complete, or even usable. Your help would be great!

## Contributing

Fork the repository and submit a pull request to contribute. You can also check out #knightos on
irc.freenode.net to talk about development. Please stick to the coding style already in place.

To test your work, open demo.html and pull up the Javascript console. `window.calc` will be a
TI83p object ready for you to play with. For example, to run some test code:

    calc.mmu.forceWrite(0x0000, 0x80); // Write ADD A, B
    calc.cpu.registers.A = 50;
    calc.cpu.registers.B = 30;
    calc.cpu.execute(1); // calc.cpu.execute(cycles) -> returns remaining cycles
    // Observe that these conditions are true:
    calc.cpu.registers.A == 80;
    calc.cpu.registers.flags.Z == 0;
    calc.cpu.registers.flags.C == 0;

The easiest way to contribute is to implement some more instructions. Look around the execute
function to find some to work on - decoding is mostly done, you just have to implement the
instruction that each comment suggests.

## Licensing

OpenTI is distributed under the [MIT license](https://github.com/KnightSoft/kernel/blob/master/LICENSE).
