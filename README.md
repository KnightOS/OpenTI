# OpenTI

An emulator for calculators with [KnightOS](https://github.com/KnightSoft/KnightOS) support. Namely:

* TI-73
* TI-83+
* TI-83+ SE
* TI-84+
* TI-84+ SE
* TI-84+ CSE

And all the variations on that theme. This is just a library, it's up to you to use it.

## Usage

This runs in the browser or with node.js (intended for use with unit tests), whichever you prefer. Do
this:

    var ti = new TI84pSE();
    // Flash memory or whatever
    ti.tick(cycles);

Read the docs for help, but this'll get you going.

## Contributing

Fork it and submit a pull request. Four spaces to an indent, opening brace on the same line.

## Licensing

OpenTI is distributed under the [MIT license](https://github.com/KnightSoft/kernel/blob/master/LICENSE).
