# OpenTI.CPU

This is the emulated Z80 CPU used by z80e to emulate the TI-73/83/84.

## Static Methods:
### fromPointer(pointer)
Creates an instance from a pointer pointing into emscripten memory.
#### Arguments
`pointer`: A pointer into emscripten memory, pointing to a `z80cpu_t`.

### CPU()
Creates a new instance of the CPU.

## Instance Methods:
### toPointer()
Returns the pointer pointing to this instance of the CPU, in emscripten memory.

### execute(cycles)
Emulates the CPU for at least `cycles` cycles, or if not passed or undefined, infinitely. Returns the amount of cycles left over.

#### Arguments
`cycles`: (defaults to `-1`) The amount of cycles to run.

### raiseInterrupt()
Raises an interrupt onto the CPU. 

## Instance Properties
### registers: OpenTI.CPU.Registers
An instance containing all registers of the emulated CPU.

### Not yet documented:
 - `IFF1`
 - `IFF2`
 - `int_mode`
 - `IFF_wait`
 - `halted`
 - `INT_pending`
 - `bus`
 - `prefix`
 - `memory`

# OpenTI.CPU.Registers
The registers of the Z80.

## Instance Properties

 - `AF`, `A`, `F`, `_AF`
 - `BC`, `B`, `C`, `_BC`
 - `DE`, `D`, `E`, `_DE`
 - `HL`, `H`, `L`, `_HL`
 - `PC`, `SP`
 - `IX`, `IXH`, `IXL`
 - `IY`, `IYH`, `IYL`
 - `I`, `R`
 - `flags`:
    - `S`, `Z`, `H`, `PV`, `N`, `C`
