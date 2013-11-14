window.openti.z80 = function() {
    var self = this;
    self.readMemory = null;
    self.writeMemory = null;
    self.readPort = null;
    self.writePort = null;
    af = bc = de = hl = ix = iy = 0;
    pc = 0; sp = 0;
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
    self.registers = (function() {
        var self = this;
        af_ = bc_ = de_ = hl_ = ix_ = iy_ = 0;
        i = 0; r = 0;

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
            update: function(oldValue, newValue, subtraction, parity, unaffected) {
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

        self.swap = function() {
            var temp;
            temp = af; af = self.af_; self.af_ = temp;
            temp = bc; bc = self.bc_; self.bc_ = temp;
            temp = hl; hl = self.hl_; self.hl_ = temp;
            temp = de; de = self.de_; self.de_ = temp;
            temp = ix; ix = self.ix_; self.ix_ = temp;
            temp = iy; iy = self.iy_; self.iy_ = temp;
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
            var newValue;
            switch (instruction) {
                case 0x00: // nop
                    cycles -= 4;
                    break;
                case 0x01: // ld bc, imm16
                    self.registers.BC(readWord(pc));
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
                    self.registers.flags.update(self.registers.B(), newValue, false, false, 'C');
                    self.registers.B(newValue);
                    cycles -= 4;
                    break;
                case 0x05: // dec b
                    newValue = (self.registers.B() - 1) & 0xFF;
                    self.registers.flags.update(self.registers.B(), newValue, true, false, 'C');
                    self.registers.B(newValue);
                    cycles -= 4;
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
