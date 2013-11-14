window.openti.z80 = function() {
    var self = this;
    self.readMemory = null;
    self.writeMemory = null;
    self.readPort = null;
    self.writePort = null;
    self.registers = (function() {
        var self = this;
        af = bc = de = hl = ix = iy = 0;
        af_ = bc_ = de_ = hl_ = ix_ = iy_ = 0;
        pc = 0; sp = 0;
        i = 0; r = 0;

        self.AF = function(value) {
            if (typeof value !== 'undefined') self.af = value & 0xFFFF;
            return af;
        };

        self.BC = function(value) {
            if (typeof value !== 'undefined') self.bc = value & 0xFFFF;
            return bc;
        };

        self.DE = function(value) {
            if (typeof value !== 'undefined') self.de = value & 0xFFFF;
            return de;
        };

        self.HL = function(value) {
            if (typeof value !== 'undefined') self.hl = value & 0xFFFF;
            return hl;
        };

        self.IX = function(value) {
            if (typeof value !== 'undefined') self.ix = value & 0xFFFF;
            return ix;
        };

        self.IY = function(value) {
            if (typeof value !== 'undefined') self.iy = value & 0xFFFF;
            return iy;
        };

        self.PC = function(value) {
            if (typeof value !== 'undefined') self.pc = value & 0xFFFF;
            return pc;
        };
        
        self.SP = function(value) {
            if (typeof value !== 'undefined') self.sp = value & 0xFFFF;
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
                self.af &= 0x00FF;
                self.af |= (value & 0xFF) << 8;
            }
            return (self.af & 0xFF00) >> 8;
        };

        self.F = function(value) {
            if (typeof value !== 'undefined') {
                self.af &= 0xFF00;
                self.af |= value & 0xFF;
            }
            return self.af & 0x00FF;
        };

        self.B = function(value) {
            if (typeof value !== 'undefined') {
                self.bc &= 0x00FF;
                self.bc |= (value & 0xFF) << 8;
            }
            return (self.bc & 0xFF00) >> 8;
        };

        self.C = function(value) {
            if (typeof value !== 'undefined') {
                self.bc &= 0xFF00;
                self.bc |= value & 0xFF;
            }
            return self.bc & 0x00FF;
        };

        self.D = function(value) {
            if (typeof value !== 'undefined') {
                self.de &= 0x00FF;
                self.de |= (value & 0xFF) << 8;
            }
            return (self.de & 0xFF00) >> 8;
        };

        self.E = function(value) {
            if (typeof value !== 'undefined') {
                self.de &= 0xFF00;
                self.de |= value & 0xFF;
            }
            return self.af & 0x00FF;
        };

        self.H = function(value) {
            if (typeof value !== 'undefined') {
                self.hl &= 0x00FF;
                self.hl |= (value & 0xFF) << 8;
            }
            return (self.hl & 0xFF00) >> 8;
        };

        self.L = function(value) {
            if (typeof value !== 'undefined') {
                self.hl &= 0xFF00;
                self.hl |= value & 0xFF;
            }
            return self.hl & 0x00FF;
        };
        
        // TODO: IXH/IXL/IYH/IYL
        
        self.flags = {
            S: function(value) {
                if (typeof value !== 'undefined') {
                    if (value) self.af |=  (1 << 7);
                    else       self.af &= ~(1 << 7);
                }
                return (self.af & (1 << 7)) > 0;
            },
            Z: function(value) {
                if (typeof value !== 'undefined') {
                    if (value) self.af |=  (1 << 6);
                    else       self.af &= ~(1 << 6);
                }
                return (self.af & (1 << 6)) > 0;
            },
            H: function(value) {
                if (typeof value !== 'undefined') {
                    if (value) self.af |=  (1 << 4);
                    else       self.af &= ~(1 << 4);
                }
                return (self.af & (1 << 4)) > 0;
            },
            PV: function(value) {
                if (typeof value !== 'undefined') {
                    if (value) self.af |=  (1 << 2);
                    else       self.af &= ~(1 << 2);
                }
                return (self.af & (1 << 2)) > 0;
            },
            N: function(value) {
                if (typeof value !== 'undefined') {
                    if (value) self.af |=  (1 << 1);
                    else       self.af &= ~(1 << 1);
                }
                return (self.af & (1 << 1)) > 0;
            },
            C: function(value) {
                if (typeof value !== 'undefined') {
                    if (value) self.af |=  (1 << 0);
                    else       self.af &= ~(1 << 0);
                }
                return (self.af & (1 << 0)) > 0;
            },
            update: function() {
                // TODO: Some function to update flags based on the result of an operation
            }
        };

        self.swap = function() {
            var temp;
            temp = self.af; self.af = self.af_; self.af_ = temp;
            temp = self.bc; self.bc = self.bc_; self.bc_ = temp;
            temp = self.hl; self.hl = self.hl_; self.hl_ = temp;
            temp = self.de; self.de = self.de_; self.de_ = temp;
            temp = self.ix; self.ix = self.ix_; self.ix_ = temp;
            temp = self.iy; self.iy = self.iy_; self.iy_ = temp;
        };

        return self;
    })();

    self.tick = function() {
    };

    return self;
}
