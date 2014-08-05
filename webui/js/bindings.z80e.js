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

		Wrap[i] = function(obj, name, location, bit, offset) {
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
					if (bit != ~0)
						Heap[location] &= ~bit;
					Heap[location] |= (val << offset) & bit;
				}
			});
		}
	}

	function isJSFunction(func_pointer) {
		console.log(func_pointer, func_pointer % 2);
		return func_pointer != 0 && (func_pointer % 2 == 0) && (func_pointer - 2) / 2 < Runtime.functionPointers.length;
	}

	Wrap.Function = function(obj, name, type, location) {
		var table = Module["dynCall_"+type];
		Object.defineProperty(obj, name, {
			get: function() {
/*				var current = Module.HEAPU32[location / 4];
				if (isJSFunction(current)) {
					return Runtime.functionPointers[(current - 2) / 2];
				} else {
					var tmp = function() {
						var val = Module.HEAPU32[location / 4];
						var argarr = Array.prototype.slice.apply(arguments);
						argarr.unshift(val);
						return table.apply(this, argarr);
					}
					tmp._wrapPointer = current;
					tmp._wrapUsage = 10000000000; // should be enough
					return tmp;
				}*/
				return Runtime.getFuncWrapper(Module.HEAPU32[location / 4], type);
			}, set: function(value) {
/*				var current = Module.HEAPU32[location / 4];
				if (current && isJSFunction(current)) {
					var func = Runtime.functionPointers[(current - 2) / 2];
					func._wrapUsage--;
					if (func._wrapUsage < 1)
						Runtime.removeFunction(func._wrapPointer);
				}

				if (!value._wrapUsage || value._wrapUsage < 1) {
					value._wrapPointer = Runtime.addFunction(value);
					value._wrapUsage = 1;
				} else {
					value._wrapUsage++;
				}


				Module.HEAPU32[location / 4] = value._wrapPointer;*/

				throw new Error("Setting functions is disabled, as the code is very unstable. (See KnightOS/OpenTI#2)");
			}
		});
	}

	function dereferencePointer(pointer) {
		return Module.HEAPU32[pointer / 4];
	}

	function CPU() {
		if(arguments.length != 0)
			return this;

		this.initWithInternalPointer(Module._cpu_init());
	}

	CPU.fromPointer = function(pointer) {
		var cpu = new CPU(false);
		cpu.initWithInternalPointer(pointer);
		return cpu;
	}

	CPU.prototype.toPointer = function() {
		return this.internalPointer;
	}

	CPU.prototype.initWithInternalPointer = function(int_point) {
		this.internalPointer = int_point;

		this.devices = [];
		for(var i = 0; i < 0x100; i++) {
			this.devices.push(CPU.Z80IODevice.fromPointer(int_point + (12 * i)));
		}

		this.registers = CPU.Registers.fromPointer(int_point + 3072);

		Wrap.UInt8(this, "IFF1", int_point + 3098, 1, 0);
		Wrap.UInt8(this, "IFF2", int_point + 3098, 2, 1);
		Wrap.UInt8(this, "int_mode", int_point + 3098, 12, 2);
		Wrap.UInt8(this, "IFF_wait", int_point + 3098, 16, 4);
		Wrap.UInt8(this, "halted", int_point + 3098, 32, 5);
		Wrap.UInt8(this, "INT_pending", int_point + 3098, 64, 6);

		Wrap.UInt8(this, "bus", int_point + 3099);
		Wrap.UInt8(this, "prefix", int_point + 3100);

		this.memory = dereferencePointer(int_point + 3101);
	}

	CPU.prototype.execute = function(cycles) {
		if (cycles == undefined) {
			cycles = -1;
		}

		return Module._cpu_execute(this.internalPointer, cycles);
	}

	CPU.prototype.raiseInterrupt = function() {
		Module._cpu_raise_interrupt(this.internalPointer);
	}

	CPU.Registers = function(pointer) {
		if (pointer != undefined)
			this.initWithInternalPointer(pointer);

		return this;
	}

	CPU.Registers.fromPointer = function(pointer) {
		return new CPU.Registers(pointer);
	}

	CPU.Registers.prototype.initWithInternalPointer = function(int_point) {
		this.internalPointer = int_point;

		Wrap.UInt16(this, "AF", int_point);
		Wrap.UInt8(this, "A", int_point);
		Wrap.UInt8(this, "F", int_point + 1);

		this.flags = {};

		Wrap.UInt8(this.flags, "S", int_point + 1, 1, 0);
		Wrap.UInt8(this.flags, "Z", int_point + 1, 2, 1);

		Wrap.UInt8(this.flags, "H", int_point + 1, 8, 3);

		Wrap.UInt8(this.flags, "PV", int_point + 1, 32, 5);
		Wrap.UInt8(this.flags, "N", int_point + 1, 64, 6);
		Wrap.UInt8(this.flags, "C", int_point + 1, 128, 7);

		Wrap.UInt16(this, "BC", int_point + 2);
		Wrap.UInt8(this, "B", int_point + 2);
		Wrap.UInt8(this, "C", int_point + 3);

		Wrap.UInt16(this, "DE", int_point + 4);
		Wrap.UInt8(this, "D", int_point + 4);
		Wrap.UInt8(this, "E", int_point + 5);

		Wrap.UInt16(this, "HL", int_point + 6);
		Wrap.UInt8(this, "H", int_point + 6);
		Wrap.UInt8(this, "L", int_point + 7);

		Wrap.UInt16(this, "_AF", int_point + 8);
		Wrap.UInt16(this, "_BC", int_point + 10);
		Wrap.UInt16(this, "_DE", int_point + 12);
		Wrap.UInt16(this, "_HL", int_point + 14);
		Wrap.UInt16(this, "PC", int_point + 16);
		Wrap.UInt16(this, "SP", int_point + 18);

		Wrap.UInt16(this, "IX", int_point + 20);
		Wrap.UInt8(this, "IXH", int_point + 20);
		Wrap.UInt8(this, "IXL", int_point + 21);

		Wrap.UInt16(this, "IY", int_point + 22);
		Wrap.UInt8(this, "IYH", int_point + 22);
		Wrap.UInt8(this, "IYL", int_point + 23);

		Wrap.UInt8(this, "I", int_point + 24);
		Wrap.UInt8(this, "R", int_point + 25);

		// length: 26
	}

	CPU.Z80IODevice = function() {
		if(arguments.length != 0)
			return this;

		this.initWithInternalPointer(Module._malloc(12));
	}

	CPU.Z80IODevice.fromPointer = function(pointer) {
		var cpu = new CPU.Z80IODevice(false);
		cpu.initWithInternalPointer(pointer);
		return cpu;
	}

	CPU.Z80IODevice.prototype.toPointer = function() {
		return this.internalPointer;
	}

	CPU.Z80IODevice.prototype.initWithInternalPointer = function(int_point) {
		this.internalPointer = int_point;
		Wrap.UInt32(this, "device", int_point);
		Wrap.Function(this, "read", "ii", int_point + 4);
		Wrap.Function(this, "write", "vii", int_point + 8);
	}

	function MMU(type) {
		if (type === undefined)
			return this;

		this.initWithInternalPointer(Module._ti_mmu_init(type));
		return this;
	}

	MMU.fromPointer = function(pointer) {
		var mmu = new MMU();
		mmu.initWithInternalPointer(pointer);
		return mmu;
	}

	MMU.prototype.toPointer = function() {
		return this.internalPointer;
	}

	MMU.prototype.initWithInternalPointer = function(int_point) {
		this.internalPointer = int_point;

		this.settings = MMU.Settings.fromPointer(dereferencePointer(int_point));
		this.banks = [
			MMU.Bank.fromPointer(int_point + 4),
			MMU.Bank.fromPointer(int_point + 12),
			MMU.Bank.fromPointer(int_point + 20),
			MMU.Bank.fromPointer(int_point + 28)];
		this.ram = new Uint8Array(Module.HEAPU8, Module.HEAP32[int_point + 36]);
		this.flash = new Uint8Array(Module.HEAPU8, Module.HEAP32[int_point + 40]);
		Wrap.Int32(this, "flash_unlocked", int_point + 44);
	}

	MMU.Bank = function(internal_pointer) {
		if (internal_pointer === undefined)
			return this;
		this.initWithInternalPointer(internal_pointer);
		return this;
	}

	MMU.Bank.fromPointer = function(pointer) {
		return new MMU.Bank(pointer);
	}

	MMU.Bank.prototype.toPointer = function() {
		return this.internalPointer;
	}

	MMU.Bank.prototype.initWithInternalPointer = function(int_point) {
		this.internalPointer = int_point;
		Wrap.UInt8(this, "page", int_point);
		Wrap.Int32(this, "flash", int_point + 3);
	}

	MMU.Settings = function(internal_pointer) {
		if (internal_pointer === undefined)
			return this;
		this.initWithInternalPointer(internal_pointer);
		return this;
	}

	MMU.Settings.fromPointer = function(pointer) {
		var mmu = new MMU.Settings();
		mmu.initWithInternalPointer(pointer);
		return mmu;
	}

	MMU.Settings.prototype.toPointer = function() {
		return this.internalPointer;
	}

	MMU.Settings.prototype.initWithInternalPointer = function(int_point) {
		this.internalPointer = int_point;
		Wrap.UInt16(this, "ramPages", int_point);
		Wrap.UInt16(this, "flashPages", int_point + 2);
	}
	
	function Asic(type) {
		if (type === undefined)
			return this;
	
		this.initWithInternalPointer(Module._asic_init(type));
		return this;
	}

	Asic.fromPointer = function(pointer) {
		var asic = new Asic();
		asic.initWithInternalPointer(pointer);

		return asic;
	}

	Asic.prototype.toPointer = function() {
		return this.internalPointer;
	}

	Asic.prototype.initWithInternalPointer = function(internal_p) {
		this.internalPointer = internal_p;
		this.cpu = CPU.fromPointer(dereferencePointer(internal_p));
		Wrap.Int32(this, "device", internal_p + 4);
		this.mmu = MMU.fromPointer(dereferencePointer(internal_p + 8));
		Wrap.Int32(this, "battery", internal_p + 12);
		Wrap.Int32(this, "battery_remove_check", internal_p + 16);
	}

	var OpenTI = {
		deviceType: {
			TI73: 0,
			TI83p: 1,
			TI83pSE: 2,
			TI84p: 3,
			TI84pSE: 4,
			TI84pCSE: 5
		},
		batteryState: {
			removed: 0,
			low: 1,
			good: 2
		},

		CPU: CPU,

		TI: {
			Asic: Asic,
			MMU: MMU
		}
	}

	return OpenTI;
})()
