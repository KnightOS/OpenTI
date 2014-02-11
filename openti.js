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
                var reg = 0;
                Object.defineProperty(self, name, {
                    get: function() {
                        return reg;
                    },
                    set: function(val) {
                        reg = val & 0xFFFF;
                    }
                });
                Object.defineProperty(self, low, {
                    get: function() {
                        return reg & 0xFF;
                    },
                    set: function(val) {
                        reg &= ~0xFF;
                        reg |= (val & 0xFF);
                    }
                });
                Object.defineProperty(self, high, {
                    get: function() {
                        return reg >> 8;
                    },
                    set: function(val) {
                        reg &= ~0xFF00;
                        reg |= ((val & 0xFF) << 8);
                    }
                });
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
                        return (self.AF & (1 << bit));
                    },
                    set: function(val) {
                        if (val == 1) self.AF |=  (1 << bit);
                        else          self.AF &= ~(1 << bit);
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
                    self.flags.S = (self.A & 0x80) == 0x80 ? 1 : 0;
                if (unaffected.indexOf('Z') == -1)
                    self.flags.Z = newValue & 1;
                // TODO: Half carry
                if (unaffected.indexOf('P') == -1) {
                    if (parity) {
                        self.flags.PV = countSetBits(self.A) % 2 & 1;
                    } else {
                        self.flags.PV = (oldValue & 0x80) == (newValue & 0x80) ? 1 : 0;
                    }
                }
                if (unaffected.indexOf('N') == -1)
                    self.flags.N = subtraction ? 1 : 0;
                if (unaffected.indexOf('C') == -1) {
                    if (subtraction) {
                        self.flags.C = newValue > oldValue ? 1 : 0;
                    } else {
                        self.flags.C = newValue < oldValue ? 1 : 0;
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

        self.tables = (function() {
            // Assume x, y, z, p, q, d, n, nn, and cycles are defined in the `this` context
            var re = self.registers;
            var tables = {
                cycles: { r: 0, rp: 0, rp2: 0, alu: 4 }, // Base cycles used by each group, some conditions add more
                r: [
                    { read: function() { return re.B; }, write: function(v) { re.B = v; } },
                    { read: function() { return re.C; }, write: function(v) { re.C = v; } },
                    { read: function() { return re.D; }, write: function(v) { re.D = v; } },
                    { read: function() { return re.E; }, write: function(v) { re.E = v; } },
                    { read: function() { return re.H; }, write: function(v) { re.H = v; } },
                    { read: function() { return re.L; }, write: function(v) { re.L = v; } },
                    { read: function() { this.cycles += 3; return readMemory(re.HL); }, write: function(v) { this.cycles += 3; writeMemory(re.HL, v); } },
                    { read: function() { return re.A; }, write: function(v) { re.A = v; } }
                ],
                rp: [
                    { read: function() { return re.BC; }, write: function(v) { re.BC = v; } },
                    { read: function() { return re.DE; }, write: function(v) { re.DE = v; } },
                    { read: function() { return re.HL; }, write: function(v) { re.HL = v; } },
                    { read: function() { return re.SP; }, write: function(v) { re.SP = v; } }
                ],
                rp2: [
                    { read: function() { return re.BC; }, write: function(v) { re.BC = v; } },
                    { read: function() { return re.DE; }, write: function(v) { re.DE = v; } },
                    { read: function() { return re.HL; }, write: function(v) { re.HL = v; } },
                    { read: function() { return re.AF; }, write: function(v) { re.SP = v; } }
                ],
                cc: [
                    { read: function() { return !re.flags.Z; }, write: function(v) { re.flags.Z = !v; } },
                    { read: function() { return re.flags.Z; }, write: function(v) { re.flags.Z = v; } },
                    { read: function() { return !re.flags.C; }, write: function(v) { re.flags.C = !v; } },
                    { read: function() { return re.flags.C; }, write: function(v) { re.flags.C = v; } },
                    { read: function() { return !re.flags.PV; }, write: function(v) { re.flags.PV = !v; } },
                    { read: function() { return re.flags.PV; }, write: function(v) { re.flags.PV = v; } },
                    { read: function() { return !re.flags.N; }, write: function(v) { re.flags.N = !v; } },
                    { read: function() { return re.flags.N; }, write: function(v) { re.flags.N = v; } }
                ],
                alu: [ // Arithmetic functions (all of these take 4 cycles)
                    function(v) { // ADD A, v
                        var old = re.A;
                        re.A += v;
                        re.updateFlags(old, re.A);
                    },
                    function(v) { // ADC A, v
                        var old = re.A;
                        re.A += v;
                        re.A += re.flags.C;
                        re.updateFlags(old, re.A);
                    },
                    function(v) { // SUB A, v
                        var old = re.A;
                        re.A -= v;
                        re.updateFlags(old, re.A, true);
                    },
                    function(v) { // SBC A, v
                        var old = re.A;
                        re.A -= v;
                        re.A -= re.flags.C;
                        re.updateFlags(old, re.A, true);
                    },
                    function(v) { // AND A, v
                        var old = re.A;
                        re.A &= v;
                        updateFlags(re.A, old);
                        re.flags.C = 0; re.flags.N = 0; re.flags.H = 1;
                    },
                    function(v) { // XOR A, v
                        var old = re.A;
                        re.A ^= v;
                        updateFlags(re.A, old);
                        re.flags.C = 0; re.flags.N = 0; re.flags.H = 0;
                    },
                    function(v) { // OR A, v
                        var old = re.A;
                        re.A |= value;
                        updateFlags(re.A, old);
                        re.flags.C = 0; re.flags.N = 0; re.flags.H = 0;
                    },
                    function(v) { // CP A, v
                        var old = re.A;
                        var a = (re.A - v) & 0xFF;
                        updateFlags(a, old, true);
                    }
                ],
            };
            return tables;
        })();

        self.execute = function(cycles) {
            while (cycles > 0) {
                var r = self.registers;
                var instruction = self.readMemory(r.PC++);
                var opcode = instruction;
                // Decode
                var context = {
                    cycles: 0,
                    opcode: opcode,
                    x: (opcode & 0xC0) >> 6,
                    y: (opcode & 0x38) >> 3,
                    z: (opcode & 0x07),
                    p: (opcode & 0x30) >> 4,
                    q: (opcode & 0x08) >> 3
                };
                // Fancy decoding
                Object.defineProperty(context, 'd', { get: function() { return self.readMemory(r.PC++); } });
                Object.defineProperty(context, 'n', { get: function() { return self.readMemory(r.PC++); } });
                Object.defineProperty(context, 'nn', { get: function() { var v = readWord(r.PC); r.PC += 2; return v; } });
                if (instruction == 0xCB || instruction == 0xDD || instruction == 0xED || instruction == 0xFD) { // Prefix bytes TODO
                    var opcode = self.readMemory(r.PC++);
                    cycles--;
                } else {
                    // Execute
                    switch (context.x) {
                        case 1:
                            if (context.z == 6 && context.y == 6) {
                                // HALT (TODO)
                            } else {
                                context.cycles = 4;
                                self.tables.r[context.y].write.apply(context, [self.tables.r[context.z].read.apply(context)]);
                                cycles -= context.cycles;
                            }
                            break;
                        case 2: // ALU instructions
                            context.cycles += self.tables.cycles.alu;
                            self.tables.alu[context.y].apply(context, [self.tables.r[context.z].read.apply(context)]);
                            cycles -= context.cycles;
                            break;
                    }
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
