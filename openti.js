/*
 * OpenTI Emulation Library
 * MIT Licensed
 * https://github.com/SirCmpwn/OpenTI
 */
(function(exports) {
    var z80 = exports.z80 = function z80() {
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
                    },
                    configurable: true
                });
                return object;
            }
            function uint16(object, name) {
                Object.defineProperty(object,name,{
                    get: function(){
                        return this.val;
                    },
                    set: function(val){
                        this.val = val & 0xFFFF;
                    },
                    configurable: true
                });
                return object;
            }
            function sign8bit(a){
                return a>0x80?-(0x100-a):a;
            }
            function countSetBits(value) {
                // Used to set the P/V flag under some conditions
                // There are some algorithms that do this faster, but we're already using JavaScript
                // so performance isn't a huge concern, plus this doesn't happen often and it's only
                // 8 bits.
                var count = 0,
                    i;
                for (i=0;i<8;i++){
                    if(value&(1<<i)>0){
                        count++;
                    }
                }
                return count;
            }
            function readSigned(address) {
                var value = readMemory(address);
                value = (value & 0x80) > 0?-(value&0x7F):value;
                // I assume you wanted to return the value
                return value;
            }
            self.registers = (function() {
                var self = this;
                function reg8pair(name) {
                    var high = name.substr(0, 1),
                        low = name.substr(1),
                        reg = 0;
                    Object.defineProperty(self, name, {
                        get: function() {
                            return reg;
                        },
                        set: function(val) {
                            reg = val & 0xFFFF;
                        },
                        configurable: true
                    });
                    Object.defineProperty(self, low, {
                        get: function() {
                            return reg & 0xFF;
                        },
                        set: function(val) {
                            reg = (reg & ~0xFF) | (val & 0xFF);
                        },
                        configurable: true
                    });
                    Object.defineProperty(self, high, {
                        get: function() {
                            return reg >> 8;
                        },
                        set: function(val) {
                            reg = (reg & ~0xFF00) | ((val & 0xFF) << 8);
                        },
                        configurable: true
                    });
                }
                function reg16(name) {
                    var reg = 0;
                    Object.defineProperty(self, name, {
                        get: function() {
                            return reg;
                        },
                        set: function(val) {
                            reg = val & 0xFFFF;
                        },
                        configurable: true
                    });
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
                self._af = self._bc = self._de = self._hl = 0;
                self.flags = {};
                function flagdef(name, bit) {
                    Object.defineProperty(self.flags, name, {
                        get: function() {
                            return (self.AF & (1 << bit)) >>> bit;
                        },
                        set: function(val) {
                            if ((val & 1) == 1){
                                self.AF |=  (1 << bit);
                            }else{
                                self.AF &= ~(1 << bit);
                            }
                        },
                        configurable: true
                    });
                }
                flagdef('S', 7);
                flagdef('Z', 6);
                flagdef('H', 4);
                flagdef('PV', 2);
                flagdef('N', 1);
                flagdef('C', 0);
                self.updateFlags = function(oldValue, newValue, subtraction, unaffected, parity) {
                    unaffected = typeof unaffected == 'undefined'?'':unaffected;
                    if (unaffected.indexOf('S') == -1){
                        self.flags.S = (self.A & 0x80) == 0x80 ? 1 : 0;
                    }
                    if (unaffected.indexOf('Z') == -1) {
                        if (newValue === 0) {
                            self.flags.Z = 1;
                        } else {
                            self.flags.Z = 0;
                        }
                    }
                    // TODO: Half carry
                    if (unaffected.indexOf('P') == -1) {
                        if (parity) {
                            self.flags.PV = countSetBits(self.A) % 2 & 1;
                        } else {
                            self.flags.PV = (oldValue & 0x80) == (newValue & 0x80) ? 1 : 0;
                        }
                    }
                    if (unaffected.indexOf('N') == -1){
                        self.flags.N = subtraction ? 1 : 0;
                    }
                    if (unaffected.indexOf('C') == -1) {
                        self.flags.C = subtraction?(newValue > oldValue ? 1 : 0):(newValue < oldValue ? 1 : 0);
                    }
                };

                self.exx = function() {
                    self.BC = [self._bc, self._bc = self.BC][0];
                    self.HL = [self._hl, self._hl = self.HL][0];
                    self.DE = [self._de, self._de = self.DE][0];
                };

                self.exAF = function() {
                    self.AF = [self._af, self._af = self.AF][0];
                };

                self.exDEHL = function() {
                    self.DE = [self.HL, self.HL = self.DE][0];
                };

                self.exDerefSPHL = function() {
                    var temp  = self.HL;
                    self.HL = readWord(self.SP);
                    writeWord(self.SP, temp);
                };

                return self;
            })();

            function readWord(address) {
                return self.readMemory(address) | (self.readMemory(address + 1) << 8);
            }
            function writeWord(address, word) {
                self.writeMemory(address, word & 0x00FF);
                self.writeMemory(address + 1, word >> 8);
            }

            self.tables = (function() {
                // Assume x, y, z, p, q, d, n, nn, and cycles are defined in the `this` context
                var re = self.registers,
                    tables = {
                    cycles: { r: 0, rp: 0, rp2: 0, alu: 4 }, // Base cycles used by each group, some conditions add more
                    r: [
                        { read: function() { return re.B; }, write: function(v) { re.B = v; } },
                        { read: function() { return re.C; }, write: function(v) { re.C = v; } },
                        { read: function() { return re.D; }, write: function(v) { re.D = v; } },
                        { read: function() { return re.E; }, write: function(v) { re.E = v; } },
                        { read: function() { return re.H; }, write: function(v) { re.H = v; } },
                        { read: function() { return re.L; }, write: function(v) { re.L = v; } },
                        { read: function() { this.cycles += 3; return self.readMemory(re.HL); }, write: function(v) { this.cycles += 3; self.writeMemory(re.HL, v); } },
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
                        { read: function() { return re.flags.Z + 1 & 1; }, write: function(v) { re.flags.Z = v + 1 & 1; } },
                        { read: function() { return re.flags.Z; }, write: function(v) { re.flags.Z = v; } },
                        { read: function() { return re.flags.C + 1 & 1; }, write: function(v) { re.flags.C = v + 1 & 1; } },
                        { read: function() { return re.flags.C; }, write: function(v) { re.flags.C = v; } },
                        { read: function() { return re.flags.PV + 1 & 1; }, write: function(v) { re.flags.PV = v + 1 & 1; } },
                        { read: function() { return re.flags.PV; }, write: function(v) { re.flags.PV = v; } },
                        { read: function() { return re.flags.N + 1 & 1; }, write: function(v) { re.flags.N = v + 1 & 1; } },
                        { read: function() { return re.flags.N; }, write: function(v) { re.flags.N = v; } }
                    ],
                    alu: [ // Arithmetic functions
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
                            re.A |= v;
                            updateFlags(re.A, old);
                            re.flags.C = 0; re.flags.N = 0; re.flags.H = 0;
                        },
                        function(v) { // CP A, v
                            var old = re.A;
                            var a = (re.A - v) & 0xFF;
                            updateFlags(old, a, true);
                        }
                    ],
                    rot: [ // TODO
                    ],
                    im: [ // TODO
                    ],
                    bli: [ // "Block" instructions
                        [null, null, null, null], // nop TODO: Is it really?
                        [null, null, null, null], // nop
                        [null, null, null, null], // nop
                        [null, null, null, null], // nop
                        [
                            function() { // LDI
                            },
                            function() { // CPI
                            },
                            function() { // INI
                            },
                            function() { // OUTI
                            }
                        ],
                        [
                            function() { // LDD
                            },
                            function() { // CPD
                            },
                            function() { // IND
                            },
                            function() { // OUTD
                            }
                        ],
                        [
                            function() { // LDIR
                            },
                            function() { // CPIR
                            },
                            function() { // INIR
                            },
                            function() { // OTIR
                            }
                        ],
                        [
                            function() { // LDDR
                            },
                            function() { // CPDR
                            },
                            function() { // INDR
                            },
                            function() { // OTDR
                            }
                        ]
                    ]
                };
                return tables;
            })();

            self.execute = function(cycles) {
                var push = function(v) {
                        r.SP -= 2;
                        writeWord(r.SP, v);
                    },
                    pop = function() {
                        var v = readWord(r.SP);
                        r.SP += 2;
                        return v;
                    },
                    _d_get = function() {
                        return sign8bit(self.readMemory(r.PC++));
                    },
                    _n_get = function() {
                        return self.readMemory(r.PC++);
                    },
                    _nn_get = function() {
                        var v = readWord(r.PC);
                        r.PC += 2;
                        return v;
                    },
                    d,
                    nn,
                    r,
                    instruction,
                    opcode,
                    context;
                while (cycles > 0) {
                    r = self.registers;
                    instruction = self.readMemory(r.PC++);
                    opcode = instruction;
                    // Decode
                    context = {
                        cycles: 0,
                        opcode: opcode,
                        x: (opcode & 0xC0) >> 6,
                        y: (opcode & 0x38) >> 3,
                        z: (opcode & 0x07),
                        p: (opcode & 0x30) >> 4,
                        q: (opcode & 0x08) >> 3
                    };
                    // Fancy decoding
                    Object.defineProperty(context, 'd', { get: _d_get, configurable: true });
                    Object.defineProperty(context, 'n', { get: _n_get, configurable: true });
                    Object.defineProperty(context, 'nn', { get: _nn_get, configurable: true });
                    // Execute
                    switch (context.x) {
                    case 0:
                        switch (context.z) {
                        case 0:
                            switch (context.y) {
                            case 0: // NOP
                                context.cycles += 4;
                                break;
                            case 1: // EX AF, AF'
                                context.cycles += 4;
                                r.exAF();
                                break;
                            case 2: // DJNZ d
                                context.cycles += 8;
                                d = context.d;
                                r.B--;
                                if (r.B !== 0) {
                                    context.cycles += 5;
                                    r.PC += d;
                                }
                                break;
                            case 3: // JR d
                                context.cycles += 12;
                                d = context.d;
                                r.PC += d;
                                break;
                            case 4:
                            case 5:
                            case 6:
                            case 7: // JR cc[y-4], d
                                context.cycles += 7;
                                d = context.d;
                                if (self.tables.cc[context.y - 4].read.apply(context) == 1) {
                                    context.cycles += 5;
                                    r.PC += d;
                                }
                                break;
                            }
                            break;
                        case 1:
                            switch (context.q) {
                            case 0: // LD rp[p], nn
                                break;
                            case 1: // ADD HL, rp[p]
                                break;
                            }
                            break;
                        case 2:
                            switch (context.q) {
                            case 0:
                                switch (context.p) {
                                case 0: // LD (BC), A
                                    break;
                                case 1: // LD (DE), A
                                    break;
                                case 2: // LD (nn), HL
                                    break;
                                case 3: // LD (nn), A
                                    break;
                                }
                                break;
                            case 1:
                                switch (context.p) {
                                case 0: // LD A, (BC)
                                    break;
                                case 1: // LD A, (DE)
                                    break;
                                case 2: // LD HL, (nn)
                                    break;
                                case 3: // LD A, (nn)
                                    break;
                                }
                                break;
                            }
                            break;
                        case 3:
                            switch (context.q) {
                            case 0: // INC rp[p]
                                break;
                            case 1: // DEC rp[p]
                                break;
                            }
                            break;
                        case 4: // INC r[y]
                            break;
                        case 5: // DEC r[y]
                            break;
                        case 6: // LD r[y], n
                            break;
                        case 7:
                            switch (context.y) {
                            case 0: // RLCA
                                break;
                            case 1: // RRCA
                                break;
                            case 2: // RLA
                                break;
                            case 3: // RRA
                                break;
                            case 4: // DAA
                                break;
                            case 5: // CPL
                                break;
                            case 6: // SCF
                                break;
                            case 7: // CCF
                                break;
                            }
                            break;
                        }
                        break;
                    case 1:
                        if (context.z == 6 && context.y == 6) { // HALT
                        } else { // LD r[y], r[z]
                            context.cycles += 4;
                            self.tables.r[context.y].write.apply(context, [self.tables.r[context.z].read.apply(context)]);
                        }
                        break;
                    case 2: // ALU instructions
                        context.cycles += self.tables.cycles.alu;
                        self.tables.alu[context.y].apply(context, [self.tables.r[context.z].read.apply(context)]);
                        break;
                    case 3:
                        switch (context.z) {
                        case 0: // RET cc[y]
                            break;
                        case 1:
                            if (context.q === 0) { // POP rp2[p]
                            } else {
                                switch (context.p) {
                                case 0: // RET
                                    break;
                                case 1: // EXX
                                    context.cycles += 4;
                                    r.exx();
                                    break;
                                case 2: // JP HL
                                    context.cycles += 4;
                                    r.PC = r.HL;
                                    break;
                                case 3: // LD SP, HL
                                    context.cycles += 6;
                                    r.SP = r.HL;
                                    break;
                                }
                            }
                            break;
                        case 2: // JP cc[y], nn
                            context.cycles += 10;
                            nn = context.nn;
                            if (self.tables.cc[context.y].read.apply(context) === 1) {
                                r.PC = nn;
                            }
                            break;
                        case 3:
                            switch (context.y) {
                            case 0: // JP nn
                                context.cycles += 10;
                                r.PC = context.nn;
                                break;
                            case 1: // (CB prefixed opcodes)
                                break;
                            case 2: // OUT (n), A
                                break;
                            case 3: // IN A, (n)
                                break;
                            case 4: // EX (SP), HL
                                context.cycles += 19;
                                r.exDerefSPHL();
                                break;
                            case 5: // EX DE, HL
                                context.cycles += 4;
                                r.exDEHL();
                                break;
                            case 6: // DI
                                break;
                            case 7: // EI
                                break;
                            }
                            break;
                        case 4: // CALL cc[y], nn
                            context.cycles += 10;
                            nn = context.nn;
                            if (self.tables.cc[context.y].read.apply(context) === 1) {
                                context.cycles += 7;
                                push(r.PC);
                                r.PC = nn;
                            }
                            break;
                        case 5:
                            if (context.q === 0) { // PUSH rp2[p]
                            } else {
                                switch (context.p) {
                                case 0: // CALL nn
                                    context.cycles += 17;
                                    push(r.PC + 2);
                                    r.PC = context.nn;
                                    break;
                                case 1: // (DD prefixed opcodes)
                                    break;
                                case 2: // (ED prefixed opcodes)
                                    break;
                                case 3: // (FD prefixed opcodes)
                                    break;
                                }
                            }
                            break;
                        case 6: // alu[y] n
                            context.cycles += self.tables.cycles.alu+3;
                            self.tables.alu[context.y].apply(context, [context.n]);
                            break;
                        case 7: // RST y*8
                            context.cycles += 11;
                            push(r.PC + 2);
                            r.PC = context.y * 8;
                            break;
                        }
                        break;
                    }
                    cycles -= context.cycles;
                    if (context.cycles === 0) { // Unimplemented opcode, decrememt to avoid an infinite loop
                        cycles--;
                    }
                }
                return cycles;
            };

            return self;
        },
        MMU = exports.MMU = function(flashPages, ramPages) {
            var self = this,
                i;
            self.flashUnlocked = false;
            self.flash = [];
            self.ram = [];
            self.banks = [
                { flash: true, page: 0 },
                { flash: true, page: 0 },
                { flash: true, page: 0 },
                { flash: false, page: 0 }
            ];

            for (i = 0; i < flashPages * 0x4000; i++) {
                self.flash[i] = 0xFF;
            }
            for (i = 0; i < ramPages * 0x4000; i++) {
                self.ram[i] = 0;
            }

            self.readMemory = function(address) {
                address &= 0xFFFF;
                var bank = self.banks[Math.floor(address / 0x4000)],
                    mappedAddress = (address % 0x4000) + (bank.page * 0x4000);
                if (bank.flash) {
                    return self.flash[mappedAddress];
                } else {
                    return self.ram[mappedAddress];
                }
            };

            self.writeMemory = function(address, value) {
                value &= 0xFF;
                address &= 0xFFFF;
                var bank = self.banks[Math.floor(address / 0x4000)],
                    mappedAddress = (address % 0x4000) + (bank.page * 0x4000);
                if (bank.flash) {
                    // TODO: Flash stuff
                } else {
                    self.ram[mappedAddress] = value;
                }
            };

            self.forceWrite = function(address, value) {
                value &= 0xFF;
                address &= 0xFFFF;
                var bank = self.banks[Math.floor(address / 0x4000)],
                    mappedAddress = (address % 0x4000) + (bank.page * 0x4000);
                if (bank.flash) {
                    self.flash[mappedAddress] = value;
                } else {
                    self.ram[mappedAddress] = value;
                }
            };

            return self;
        },
        ASIC = exports.ASIC = function(clocks, usb) {
            var self = this,
                i,
                _read = function(asic) { return -1; },
                _write = function(asic, value) { };
            self.privledgedPages = [];
            self.cpu = new z80();
            self.mmu = new MMU(0x20, 3);
            self.cpu.readMemory = self.mmu.readMemory;
            self.cpu.writeMemory = self.mmu.writeMemory;

            self.hardware = [];
            for (i = 0; i < 0x100; i++) {
                self.hardware[i] = {
                    read: _read,
                    write: _write,
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
        },
        TI83p = exports.TI83p = function TI83p() {
            var self = this;
            self.asic = new ASIC(false, false);
            self.asic.privledgedPages = [ 0x1C, 0x1D, 0x1F ];

            self.cpu = self.asic.cpu;
            self.mmu = self.asic.mmu;
            self.execute = self.cpu.execute;

            return self;
        };
})(typeof exports === 'undefined' ? this['OpenTI'] = {} : exports);
