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

To test your work, start up node.js and require the module. Here's an example of how I might test
`ADD A, B`:

    > var OpenTI = require('./openti.js')
    undefined
    > var calc = new OpenTI.TI83p();
    undefined
    > calc.mmu.forceWrite(0, 0x80); // 0x80 is ADD A, B
    undefined
    > calc.cpu.registers.A = 10
    10
    > calc.cpu.registers.B = 20
    20
    > calc.cpu.execute(1)
    -3
    > calc.cpu.registers.A
    30
    > calc.cpu.registers.flags.Z
    0
    > calc.cpu.registers.flags.C
    0

The easiest way to contribute is to implement some more instructions. Look around the execute
function to find some to work on - decoding is mostly done, you just have to implement the
instruction that each comment suggests.

## Testing

To run all tests:

    $ node tests.js

To run specific tests:

    $ node tests.js "DJNZ d" "XOR A, r" "EX AF, AF'"

To list all tests:

    $ node tests.js --list

To write a test, edit tests.js with your test, it should be pretty straightforward. The goal
is to have a test for every instruction. You can get a good idea of how things are coming
along by reading the [Travis log](https://travis-ci.org/KnightOS/OpenTI).

## Licensing

OpenTI is distributed under the [MIT license](https://github.com/KnightSoft/kernel/blob/master/LICENSE).
