window.openti.z80 = function() {
    var self = this;
    self.readMemory = null;
    self.writeMemory = null;
    self.readPort = null;
    self.writePort = null;
    af = bc = de = hl = ix = iy = 0;
    pc = 0; sp = 0;
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
            return (af & 0xFF00) >> 8;
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
            return (bc & 0xFF00) >> 8;
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
            return (de & 0xFF00) >> 8;
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
            return (hl & 0xFF00) >> 8;
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
            update: function() {
                // TODO: Some function to update flags based on the result of an operation
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
                default:
                    cycles--; // TODO: Raise some sort of exception
                    break;
            }
        }
        return cycles;
    };

    return self;
}
