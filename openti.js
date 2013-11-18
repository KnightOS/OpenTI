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
        var af = bc = de = hl = ix = iy = 0;
        var pc = 0; sp = 0;
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
            var af_ = bc_ = de_ = hl_ = ix_ = iy_ = 0;
            var i = r = 0;

            self.AF = function(value) {
                if (typeof value !== 'undefined') af = value & 0xFFFF;
                return af;
            };

            self.BC = function(value) {
                if (typeof value !== 'undefined') bc = value & 0xFFFF;
                return bc;
            };

            self.DE = function(value) {
                if (typeof value !== 'undefined') de = value & 0xFFFF;
                return de;
            };

            self.HL = function(value) {
                if (typeof value !== 'undefined') hl = value & 0xFFFF;
                return hl;
            };

            self.IX = function(value) {
                if (typeof value !== 'undefined') ix = value & 0xFFFF;
                return ix;
            };

            self.IY = function(value) {
                if (typeof value !== 'undefined') iy = value & 0xFFFF;
                return iy;
            };

            self.PC = function(value) {
                if (typeof value !== 'undefined') pc = value & 0xFFFF;
                return pc;
            };
            
            self.SP = function(value) {
                if (typeof value !== 'undefined') sp = value & 0xFFFF;
                return sp;
            };

            self.I = function(value) {
                if (typeof value !== 'undefined') self.i = value & 0xFF;
                return i;
            };

            self.R = function(value) {
                if (typeof value !== 'undefined') self.r = value & 0xFF;
                return r;
            }

            self.A = function(value) {
                if (typeof value !== 'undefined') {
                    af &= 0x00FF;
                    af |= (value & 0xFF) << 8;
                }
                return af >> 8;
            };

            self.F = function(value) {
                if (typeof value !== 'undefined') {
                    af &= 0xFF00;
                    af |= value & 0xFF;
                }
                return af & 0x00FF;
            };

            self.B = function(value) {
                if (typeof value !== 'undefined') {
                    bc &= 0x00FF;
                    bc |= (value & 0xFF) << 8;
                }
                return bc >> 8;
            };

            self.C = function(value) {
                if (typeof value !== 'undefined') {
                    bc &= 0xFF00;
                    bc |= value & 0xFF;
                }
                return bc & 0x00FF;
            };

            self.D = function(value) {
                if (typeof value !== 'undefined') {
                    de &= 0x00FF;
                    de |= (value & 0xFF) << 8;
                }
                return de >> 8;
            };

            self.E = function(value) {
                if (typeof value !== 'undefined') {
                    de &= 0xFF00;
                    de |= value & 0xFF;
                }
                return af & 0x00FF;
            };

            self.H = function(value) {
                if (typeof value !== 'undefined') {
                    hl &= 0x00FF;
                    hl |= (value & 0xFF) << 8;
                }
                return hl >> 8;
            };

            self.L = function(value) {
                if (typeof value !== 'undefined') {
                    hl &= 0xFF00;
                    hl |= value & 0xFF;
                }
                return hl & 0x00FF;
            };
            
            // TODO: IXH/IXL/IYH/IYL
            
            self.flags = {
                S: function(value) {
                    if (typeof value !== 'undefined') {
                        if (value) af |=  (1 << 7);
                        else       af &= ~(1 << 7);
                    }
                    return (af & (1 << 7)) > 0;
                },
                Z: function(value) {
                    if (typeof value !== 'undefined') {
                        if (value) af |=  (1 << 6);
                        else       af &= ~(1 << 6);
                    }
                    return (af & (1 << 6)) > 0;
                },
                H: function(value) {
                    if (typeof value !== 'undefined') {
                        if (value) af |=  (1 << 4);
                        else       af &= ~(1 << 4);
                    }
                    return (af & (1 << 4)) > 0;
                },
                PV: function(value) {
                    if (typeof value !== 'undefined') {
                        if (value) af |=  (1 << 2);
                        else       af &= ~(1 << 2);
                    }
                    return (af & (1 << 2)) > 0;
                },
                N: function(value) {
                    if (typeof value !== 'undefined') {
                        if (value) af |=  (1 << 1);
                        else       af &= ~(1 << 1);
                    }
                    return (af & (1 << 1)) > 0;
                },
                C: function(value) {
                    if (typeof value !== 'undefined') {
                        if (value) af |=  (1 << 0);
                        else       af &= ~(1 << 0);
                    }
                    return (af & (1 << 0)) > 0;
                },
                update: function(oldValue, newValue, subtraction, unaffected, parity) {
                    if (!unaffected) unaffected = '';
                    if (unaffected.indexOf('S') == -1)
                        self.flags.S((self.A() & 0x80) == 0x80);
                    if (unaffected.indexOf('Z') == -1)
                        self.flags.Z(newValue == 0);
                    // TODO: Half carry
                    if (unaffected.indexOf('P') == -1) {
                        if (parity) {
                            self.flags.PV(countSetBits(self.A()) % 2 == 0);
                        } else {
                            self.flags.PV((oldValue & 0x80) == (newValue & 0x80));
                        }
                    }
                    if (unaffected.indexOf('N') == -1)
                        self.flags.N(subtraction);
                    if (unaffected.indexOf('C') == -1) {
                        if (subtraction) {
                            self.flags.C(newValue > oldValue);
                        } else {
                            self.flags.C(newValue < oldValue);
                        }
                    }
                }
            };

            self.exx = function() {
                var temp;
                temp = bc; bc = self.bc_; self.bc_ = temp;
                temp = hl; hl = self.hl_; self.hl_ = temp;
                temp = de; de = self.de_; self.de_ = temp;
            };

            self.exAF = function() {
                var temp;
                temp = af; af = self.af_; self.af_ = temp;
            };

            self.exDEHL = function() {
                var temp;
                temp = de; de = hl; hl = temp;
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
                var instruction = self.readMemory(pc++);
                var newValue, bit;
                switch (instruction) {
                    case 0x00: // nop
                        cycles -= 4;
                        break;
                    case 0x01: // ld bc, imm16
                        bc = readWord(pc);
                        pc += 2;
                        cycles -= 10;
                        break;
                    case 0x02: // ld (bc), a
                        self.writeMemory(bc, af >> 8);
                        cycles -= 7;
                        break;
                    case 0x03: // inc bc
                        bc++;
                        cycles -= 6;
                        break;
                    case 0x04: // inc b
                        newValue = (self.registers.B() + 1) & 0xFF;
                        self.registers.flags.update(self.registers.B(), newValue, false, 'C');
                        self.registers.B(newValue);
                        cycles -= 4;
                        break;
                    case 0x05: // dec b
                        newValue = (self.registers.B() - 1) & 0xFF;
                        self.registers.flags.update(self.registers.B(), newValue, true, 'C');
                        self.registers.B(newValue);
                        cycles -= 4;
                        break;
                    case 0x06: // ld b, imm8
                        bc &= 0x00FF;
                        bc |= self.readMemory(pc++) << 8;
                        cycles -= 7;
                        break;
                    case 0x07: // rlca
                        bit = (af & 0x8000) > 0;
                        newValue = ((af << 1) & 0xFF00);
                        af &= 0x00FF; af |= newValue;
                        self.registers.flags.C(bit);
                        self.registers.flags.N(false);
                        self.registers.flags.H(false);
                        if (bit) af |= 0x0100;
                        cycles -= 4;
                        break;
                    case 0x08: // ex af, af'
                        self.registers.exAF();
                        cycles -= 4;
                        break;
                    case 0x09: // add hl, bc
                        newValue = (hl + bc) & 0xFFFF;
                        self.registers.flags.update(hl, newValue, false, 'ZSP');
                        hl = newValue;
                        cycles -= 11;
                        break;
                    case 0x0A: // ld a, (bc)
                        self.registers.A(self.readMemory(bc));
                        cycles -= 11;
                        break;
                    case 0x0B: // dec bc
                        bc = (bc - 1) & 0xFFFF;
                        cycles -= 6;
                        break;
                    case 0x0C: // inc c
                        newValue = (self.registers.C() + 1) & 0xFF;
                        self.flags.update(self.registers.C(), newValue, false, 'C');
                        self.registers.C(newValue);
                        cycles -= 4;
                        break;
                    case 0x0D: // dec c
                        newValue = (self.registers.C() - 1) & 0xFF;
                        self.flags.update(self.registers.C(), newValue, true, 'C');
                        self.registers.C(newValue);
                        cycles -= 4;
                        break;
                    case 0x0E: // ld c, imm8
                        bc &= 0xFF00;
                        bc |= self.readMemory(pc++);
                        cycles -= 7;
                        break;
                    case 0x0F: // rrca
                        bit = (af & 0x0100) > 0;
                        newValue = ((af >> 1) & 0xFF00);
                        af &= 0x00FF; af |= newValue;
                        self.registers.flags.C(bit);
                        self.registers.flags.N(false);
                        self.registers.flags.H(false);
                        if (bit) af |= 0x8000;
                        cycles -= 4;
                        break;
                    case 0x10: // djnz imm8
                        newValue = ((bc & 0xFF00) >> 8) - 1;
                        newValue &= 0xFF;
                        bc |= newValue;
                        if (newValue != 0) {
                            pc += readSigned(pc);
                            cycles -= 8;
                        } else cycles -= 13;
                        pc++;
                        break;
                    default:
                        cycles--; // TODO: Raise some sort of error
                        break;
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
