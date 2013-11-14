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
