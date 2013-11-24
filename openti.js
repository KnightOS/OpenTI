/*
 * OpenTI Emulation Library
 * MIT Licensed
 * https://github.com/SirCmpwn/OpenTI
 */
(function(exports) {
    function z80() {
        var self = this;
        self.readMemory = null;
        self.writeMemory = null;
        self.readPort = null;
        self.writePort = null;

        function uint8(object, name) {
            Object.defineProperty(object, name, {
                get: function() {
                    return this.val;
                },
                set: function(val) {
                    this.val = val;
                    this.val &= 0xFF;
                }
            });
            return object;
        };
        function uint16(object, name) {
            Object.defineProperty(object, name, {
                get: function() {
                    return this.val;
                },
                set: function(val) {
                    this.val = val;
                    this.val &= 0xFFFF;
                }
            });
            return object;
        };
        function countSetBits(value) {
            // Used to set the P/V flag under some conditions
            // There are some algorithms that do this faster, but we're already using JavaScript
            // so performance isn't a huge concern, plus this doesn't happen often and it's only
            // 8 bits.
            var count = 0;
            for (var i = 0; i < 8; i++) {
                if (value & (1 << i) > 0) {
                    count++;
                }
            }
            return count;
        }
        function readSigned(address) {
            var value = readMemory(address);
            if ((value & 0x80) > 0) {
                value &= 0x7F;
                value = -value;
            }
        }
        self.registers = (function() {
            var self = this;
            function reg8pair(name) {
                var high = name.substr(0, 1);
                var low = name.substr(1);
                Object.defineProperty(self, name, {
                    get: function() {
                        return this.val;
                    },
                    set: function(val) {
                        this.val = val & 0xFFFF;
                    }
                });
                Object.defineProperty(self, low, {
                    get: function() {
                        return this.val & 0xFF;
                    },
                    set: function(val) {
                        self[name] &= ~0xFF;
                        self[name] |= (val & 0xFF);
                    }
                });
                Object.defineProperty(self, high, {
                    get: function() {
                        return this.val >> 8;
                    },
                    set: function(val) {
                        self[name] &= ~0xFF00;
                        self[name] |= ((val & 0xFF) << 8);
                    }
                });
                self[name] = 0;
            };
            function reg16(name) {
                Object.defineProperty(self, name, {
                    get: function() {
                        return this.val;
                    },
                    set: function(val) {
                        this.val = val & 0xFFFF;
                    }
                });
                self[name] = 0;
            }
            // TODO: IXH/IXL/IYH/IYL
            reg8pair('AF');
            reg8pair('BC');
            reg8pair('DE');
            reg8pair('HL');
            reg16('PC');
            reg16('SP');
            reg16('IX');
            reg16('IY');
            // Shadow regs
            var _af = _bc = _de = _hl = 0;
            
            self.flags = {};
            function flagdef(name, bit) {
                Object.defineProperty(self.flags, name, {
                    get: function() {
                        return (self.AF & (1 << bit)) > 0;
                    },
                    set: function(val) {
                        if (val) self.AF |=  (1 << bit);
                        else     self.AF &= ~(1 << bit);
                    }
                });
            };
            flagdef('S', 7);
            flagdef('Z', 6);
            flagdef('H', 4);
            flagdef('PV', 2);
            flagdef('N', 1);
            flagdef('C', 0);
            self.updateFlags = function(oldValue, newValue, subtraction, unaffected, parity) {
                if (!unaffected) unaffected = '';
                if (unaffected.indexOf('S') == -1)
                    self.flags.S = (self.A() & 0x80) == 0x80;
                if (unaffected.indexOf('Z') == -1)
                    self.flags.Z = newValue == 0;
                // TODO: Half carry
                if (unaffected.indexOf('P') == -1) {
                    if (parity) {
                        self.flags.PV = countSetBits(self.A()) % 2 == 0;
                    } else {
                        self.flags.PV = (oldValue & 0x80) == (newValue & 0x80);
                    }
                }
                if (unaffected.indexOf('N') == -1)
                    self.flags.N = subtraction;
                if (unaffected.indexOf('C') == -1) {
                    if (subtraction) {
                        self.flags.C = newValue > oldValue;
                    } else {
                        self.flags.C = newValue < oldValue;
                    }
                }
            };

            self.exx = function() {
                var temp;
                temp = self.BC; self.BC = bc_; bc_ = temp;
                temp = self.HL; self.HL = hl_; hl_ = temp;
                temp = self.DE; self.DE = de_; de_ = temp;
            };

            self.exAF = function() {
                var temp;
                temp = self.AF; self.AF = af_; af_ = temp;
            };

            self.exDEHL = function() {
                var temp;
                temp = self.DE; self.DE = self.HL; self.HL = temp;
            };

            return self;
        })();

        function readWord(address) {
            return self.readMemory(address) | (self.readMemory(address + 1) << 8);
        };
        function writeWord(address, word) {
            self.writeMemory(address, word >> 8);
            self.writeMemory(address, word & 0x00FF);
        };

        self.execute = function(cycles) {
            while (cycles > 0) {
                var r = self.registers;
                var instruction = self.readMemory(r.PC++);
                if (instruction == 0xCB || instruction == 0xDD || instruction == 0xED || instruction == 0xFD) { // Prefix bytes
                    // TODO
                    var opcode = self.readMemory(r.PC++);
                    cycles--;
                } else {
                    var opcode = instruction;
                    // Decode
                    var x = (opcode & 0xC0) >> 6;
                    var y = (opcode & 0x38) >> 3;
                    var z = (opcode & 0x07);
                    var p = (opcode & 0x30) >> 4;
                    var q = (opcode & 0x08) >> 3;
                    function d() { return self.readMemory(r.PC++); }
                    function n() { return self.readMemory(r.PC++); }
                    function nn() { var v = readWord(r.PC); r.PC += 2; return v; }
                }
            }
            return cycles;
        };

        return self;
    }

    function MMU(flashPages, ramPages) {
        var self = this;
        self.flashUnlocked = false;
        self.flash = [];
        self.ram = [];
        self.banks = [
            { flash: true, page: 0 },
            { flash: true, page: 0 },
            { flash: true, page: 0 },
            { flash: false, page: 0 }
        ];

        for (var i = 0; i < flashPages * 0x4000; i++) {
            self.flash[i] = 0xFF;
        }
        for (var i = 0; i < ramPages * 0x4000; i++) {
            self.ram[i] = 0;
        }

        self.readMemory = function(address) {
            address &= 0xFFFF;
            var bank = self.banks[Math.floor(address / 0x4000)];
            var mappedAddress = (address % 0x4000) + (bank.page * 0x4000);
            if (bank.flash) {
                return self.flash[mappedAddress];
            } else {
                return self.ram[mappedAddress];
            }
        };

        self.writeMemory = function(address, value) {
            value &= 0xFF;
            address &= 0xFFFF;
            var bank = self.banks[Math.floor(address / 0x4000)];
            var mappedAddress = (address % 0x4000) + (bank.page * 0x4000);
            if (bank.flash) {
                // TODO: Flash stuff
            } else {
                self.ram[mappedAddress] = value;
            }
        };

        self.forceWrite = function(address, value) {
            value &= 0xFF;
            address &= 0xFFFF;
            var bank = self.banks[Math.floor(address / 0x4000)];
            var mappedAddress = (address % 0x4000) + (bank.page * 0x4000);
            if (bank.flash) {
                self.flash[mappedAddress] = value;
            } else {
                self.ram[mappedAddress] = value;
            }
        };

        return self;
    };

    function ASIC(clocks, usb) {
        var self = this;
        self.privledgedPages = [];
        self.cpu = new z80();
        self.mmu = new MMU(0x20, 3);
        self.cpu.readMemory = self.mmu.readMemory;
        self.cpu.writeMemory = self.mmu.writeMemory;

        self.hardware = [];
        for (var i = 0; i < 0x100; i++) {
            self.hardware[i] = {
                read: function(asic) { return -1; },
                write: function(asic, value) { },
                isProtected: false
            };
        }

        self.cpu.readPort = function(port) {
            return self.hardware[port].read(self);
        };
        self.cpu.writePort = function(port, value) {
            if (self.hardware[port].isProtected && !self.mmu.flashUnlocked)
                return;
            self.hardware[port].write(self, value);
        };

        return self;
    };

    function TI83p() {
        var self = this;
        self.asic = new ASIC(false, false);
        self.asic.privledgedPages = [ 0x1C, 0x1D, 0x1F ];

        self.cpu = self.asic.cpu;
        self.mmu = self.asic.mmu;
        self.execute = self.cpu.execute;

        return self;
    };

    exports.z80 = z80;
    exports.ASIC = ASIC;
    exports.MMU = MMU;
    exports.TI83p = TI83p;
})(typeof exports === 'undefined' ? this['OpenTI'] = {} : exports);
