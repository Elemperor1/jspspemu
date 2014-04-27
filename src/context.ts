﻿import _manager = require('./hle/manager');
import _display = require('./core/display');
import _controller = require('./core/controller');
import _gpu = require('./core/gpu');
import _cpu = require('./core/cpu');
import _audio = require('./core/audio');
import _memory = require('./core/memory');
import _interrupt = require('./core/interrupt');

export interface ISymbol {
	address: number;
	size: number;
	name: string;
}

export interface ISymbolLookup {
	getSymbolAt(address: number): ISymbol;
}

export class EmulatorContext {
	display: _display.IPspDisplay;
	controller: _controller.IPspController;
	gpu: _gpu.PspGpu;
	memoryManager: _manager.MemoryManager;
	threadManager: _manager.ThreadManager;
	audio: _audio.PspAudio;
	memory: _memory.Memory;
	instructionCache: _cpu.InstructionCache;
	fileManager: _manager.FileManager;
	output: string = '';
	interruptManager: _interrupt.InterruptManager;
	symbolLookup: ISymbolLookup;

	constructor() {
	}

	init(interruptManager: _interrupt.InterruptManager, display: _display.IPspDisplay, controller: _controller.IPspController, gpu: _gpu.PspGpu, memoryManager: _manager.MemoryManager, threadManager: _manager.ThreadManager, audio: _audio.PspAudio, memory: _memory.Memory, instructionCache: _cpu.InstructionCache, fileManager: _manager.FileManager) {
		this.interruptManager = interruptManager;
		this.display = display;
		this.controller = controller;
		this.gpu = gpu;
		this.memoryManager = memoryManager;
		this.threadManager = threadManager;
		this.audio = audio;
		this.memory = memory;
		this.instructionCache = instructionCache;
		this.fileManager = fileManager;
		this.output = '';
	}
}