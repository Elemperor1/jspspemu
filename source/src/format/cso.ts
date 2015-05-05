﻿///<reference path="../global.d.ts" />

import zlib = require('./zlib');

var CSO_MAGIC = 'CISO';

class Header {
    magic: string;
    headerSize: number;
    totalBytes: number;
    blockSize: number;
    version: number;
    alignment: number;
    reserved: number;

    get numberOfBlocks() { return Math.floor(this.totalBytes / this.blockSize); }

    static struct = StructClass.create<Header>(Header, [
		{ magic: Stringz(4) },
		{ headerSize: UInt32 },
		{ totalBytes: Int64 },
		{ blockSize: UInt32 },
		{ version: UInt8 },
		{ alignment: UInt8 },
		{ reserved: UInt16 },
    ]);
}

class Block {
	private _uncompressedData: Uint8Array = null;
	public compressedData: Uint8Array;
	public compressed: boolean;
	public low: number;
	public high: number;
	
	constructor(raw1:number, raw2:number) {
		this.compressed = (raw1 & 0x80000000) == 0;
		this.low = raw1 & 0x7FFFFFFF;
		this.high = raw2 & 0x7FFFFFFF;
	}
	
	get uncompresesdData():Uint8Array {
		if (!this._uncompressedData) {
			if (this.compressed) {
				this._uncompressedData = zlib.inflate_raw(this.compressedData);  
			} else {
				this._uncompressedData = this.compressedData; 
			}
		}
		return this._uncompressedData;
	}
	
	get size() {
		return this.high - this.low;
	}
	
	static getBlocksUncompressedData(blocks: Block[]) {
		return ArrayBufferUtils.concat(blocks.map(v => v.uncompresesdData));
	}
}

export class Cso implements AsyncStream {
	date: Date = new Date();
    private stream: AsyncStream;
    private header: Header;
	private offsets: Uint32Array;
	
	private getBlockInfo(index:number) {
		return new Block(this.offsets[index + 0], this.offsets[index + 1]);
	}

	static fromStreamAsync(stream: AsyncStream) {
        return new Cso().loadAsync(stream);
    }

	get name() { return this.stream.name; }
    get size() { return this.header.totalBytes; }
	
	private readUncachedBlocksAsync(index: number, count:number):Promise2<Block[]> {
		var low = this.getBlockInfo(index).low;
		var high = this.getBlockInfo(index + count - 1).high;
		return this.stream.readChunkAsync(low, high - low).then((data) => {
			var chunks:Block[] = [];
			for (var n = 0; n < count; n++) {
				var chunk = this.getBlockInfo(index + n);
				chunk.compressedData = new Uint8Array(data, chunk.low - low, chunk.size);
				chunks.push(chunk);
			}
			return chunks;
		});		
	}

	readChunkAsync(offset: number, count: number): Promise2<ArrayBuffer> {
		var blockIndexLow = Math.floor(offset / this.header.blockSize);
		var blockIndexHigh = Math.floor((offset + count - 1) / this.header.blockSize);
		var blockCount = blockIndexHigh - blockIndexLow + 1;
		//var skip = (this.header.blockSize - (offset % this.header.blockSize)) % this.header.blockSize;
		var skip = offset % this.header.blockSize;
		
		return this.readUncachedBlocksAsync(blockIndexLow, blockCount).then(blocks => {
			return Block.getBlocksUncompressedData(blocks).slice(skip);
		});
    }

    private loadAsync(stream: AsyncStream) {
		this.stream = stream;
		this.date = stream.date;

        return stream.readChunkAsync(0, Header.struct.length).then(buffer => {
            var header = this.header = Header.struct.read(Stream.fromArrayBuffer(buffer));
            if (header.magic != CSO_MAGIC) throw ('Not a CSO file');

            return stream.readChunkAsync(Header.struct.length, (header.numberOfBlocks + 1) * 4).then(buffer => {
                this.offsets = new Uint32Array(buffer);
                return this;
            });
        });
    }
}
