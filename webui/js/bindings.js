var OpenTI = (function() {
    var Wrap = {};
    var ShouldWrap = {
        Int32: ["HEAP32", 4],
        UInt32: ["HEAPU32", 4],
        Int16: ["HEAP16", 2],
        UInt16: ["HEAPU16", 2],
        Int8: ["HEAP8", 1],
        UInt8: ["HEAPU8", 1]
    }
    for(var i in ShouldWrap) {
        var Heap = Module[ShouldWrap[i][0]];
        var Divisor = ShouldWrap[i][1];

        Wrap[i] = (function(Heap, Divisor) {
            return function(obj, name, location, bit, offset) {
                location /= Divisor;

                if (bit == undefined) {
                    bit = ~0;
                    offset = 0;
                }

                Object.defineProperty(obj, name, {
                    get: function() {
                        return (Heap[location] & bit) >> offset;
                    },
                    set: function(val) {
                        if (bit != ~0) {
                            Heap[location] &= ~bit;
                        }
                        Heap[location] |= (val << offset) & bit;
                    }
                });
            }
        })(Heap, Divisor);
    }

    Wrap.Pointer = function(obj, name, location, pointerClass) {
        location /= 4;

        Object.defineProperty(obj, name, {
            get: function() {
                return new pointerClass(Module.HEAPU32[location]);
            },

            set: function(val) {
                Module.HEAPU32[location] = val.pointer;
            }
        });
    }

    var Core = {};

    Core.Registers = function(pointer) {
        if (!pointer) {
            throw "This object can only be instantiated with a memory region predefined!";
        }
        this.pointer = pointer;

        Wrap.UInt16(this, "AF", pointer);
        Wrap.UInt8(this, "F", pointer);
        Wrap.UInt8(this, "A", pointer + 1);

        this.flags = {};
        Wrap.UInt8(this.flags, "C",  pointer, 128, 7);
        Wrap.UInt8(this.flags, "N",  pointer,  64, 6);
        Wrap.UInt8(this.flags, "PV", pointer,  32, 5);
        Wrap.UInt8(this.flags, "3",  pointer,  16, 4);
        Wrap.UInt8(this.flags, "H",  pointer,   8, 3);
        Wrap.UInt8(this.flags, "5",  pointer,   4, 2);
        Wrap.UInt8(this.flags, "Z",  pointer,   2, 1);
        Wrap.UInt8(this.flags, "S",  pointer,   1, 0);
        pointer += 2;

        Wrap.UInt16(this, "BC", pointer);
        Wrap.UInt8(this, "C", pointer);
        Wrap.UInt8(this, "B", pointer + 1);
        pointer += 2;

        Wrap.UInt16(this, "DE", pointer);
        Wrap.UInt8(this, "E", pointer);
        Wrap.UInt8(this, "D", pointer + 1);
        pointer += 2;

        Wrap.UInt16(this, "HL", pointer);
        Wrap.UInt8(this, "L", pointer);
        Wrap.UInt8(this, "H", pointer + 1);
        pointer += 2;

        Wrap.UInt16(this, "_AF", pointer);
        Wrap.UInt16(this, "_BC", pointer + 2);
        Wrap.UInt16(this, "_DE", pointer + 4);
        Wrap.UInt16(this, "_HL", pointer + 6);
        pointer += 8;

        Wrap.UInt16(this, "PC", pointer);
        Wrap.UInt16(this, "SP", pointer + 2);
        pointer += 4;

        Wrap.UInt16(this, "IX", pointer);
        Wrap.UInt8(this, "IXL", pointer);
        Wrap.UInt8(this, "IXH", pointer + 1);
        pointer += 2;

        Wrap.UInt16(this, "IY", pointer);
        Wrap.UInt8(this, "IYL", pointer);
        Wrap.UInt8(this, "IYH", pointer + 1);
        pointer += 2;

        Wrap.UInt8(this, "I", pointer++);
        Wrap.UInt8(this, "R", pointer++);

        // 2 dummy bytes needed for 4-byte alignment
    }

    Core.Registers.sizeOf = function() {
        return 26 + 2;
    }

    Core.CPU = function(pointer) {
        if (!pointer) {
            pointer = Module["_cpu_init"]();
        }
        this.pointer = pointer;

        this.devices = [];
        for (var i = 0; i < 0x100; i++) {
            this.devices.push(new Core.CPU.IODevice(pointer));
            pointer += Core.CPU.IODevice.sizeOf();
        }
        this.registers = new Core.Registers(pointer);
        pointer += Core.Registers.sizeOf();

        Wrap.UInt8(this, "IFF1", pointer, 1, 0);
        Wrap.UInt8(this, "IFF2", pointer, 2, 1);
        Wrap.UInt8(this, "int_mode", pointer, 12, 2);
        pointer++;

        Wrap.UInt8(this, "bus", pointer++);

        Wrap.UInt16(this, "prefix", pointer);
        pointer += 2;

        Wrap.UInt32(this, "memory", pointer);
        pointer += 4;

        //Wrap.Function(this, "read_byte", pointer);
        pointer += 4;
        //Wrap.Function(this, "write_byte", pointer);
        pointer += 4;

        Wrap.Int32(this, "interrupt", pointer);
        pointer += 4;

        this.hook = new Debugger.HookInfo(pointer);
    }

    Core.CPU.prototype.execute = function(cycles) {
        if (!cycles) {
            cycles = -1;
        }
        return Module["_cpu_execute"](this.pointer, cycles);
    }

    Core.CPU.prototype.free = function() {
        Module["_cpu_free"](this.pointer);
    }

    Core.CPU.sizeOf = function() {
        return 100 * Core.CPU.IODevice.sizeOf() + 20 + Debugger.HookInfo.sizeOf();
    }

    Core.CPU.IODevice = function(pointer) {
        if (!pointer) {
            throw "This object can only be instantiated with a memory region predefined!";
        }

        this.pointer = pointer;
        Wrap.UInt32(this, "device", pointer);
        // TODO: function wrapping
    }

    Core.CPU.IODevice.sizeOf = function() {
        return 3 * 4;
    }

    var Debugger = {};

    Debugger.HookInfo = function(pointer) {
        if (!pointer) {
            throw "This object can only be instantiated with a memory region predefined!";
        }

        this.pointer = pointer;
    }; // TODO

    Debugger.HookInfo.sizeOf = function() {
        // TODO
        return -1;
    }

    var TI = {};

    TI.ASIC = function(device) {
        pointer = Module["_asic_init"](device);

        this.pointer = pointer;

        Wrap.Pointer(this, "cpu", pointer, Core.CPU);
    }

    TI.ASIC.prototype.free = function() {
        Module["_asic_free"](this.pointer);
    }

    TI.DeviceType = {
        TI73: 0,
        TI83p: 1,
        TI83pSE: 2,
        TI84p: 3,
        TI84pSE: 4,
        TI84pCSE: 5
    };

    return { Core: Core, Debugger: Debugger, TI: TI };
})();
