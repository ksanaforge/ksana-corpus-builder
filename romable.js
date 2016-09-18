var Ksanapos=require("./ksanapos");

const Romable=function(){
	var fields={},texts=[],linepos=[],bookpos=[];
	var token_postings={};

	var rom={texts,fields};
	const putField=function(name,value,kpos){
		if (!fields[name]) fields[name]=[];
		fields[name].push([kpos,value]);
	}
	const findField=function(name,kpos){
		var out=[];
		if (!fields[name])return null;
		for (var i=0;i<fields[name].length;i++) {
			if (fields[name][0]==kpos	) {
				out.push(fields[name[1]]);
			}
		}
		return out;
	}
	const getField=function(name){
		return fields[name];
	}

	const getFields=function(){
		return fields;
	}
	const putLine=function(line,kpos){
		var parts=Ksanapos.unpack(kpos,this.addressPattern);
		var levels=[],i;
		for (i=0;i<parts.length-1;i++){//drop ch
			if (i && !this.addressPattern.bits[i]) continue;

			levels.push(parts[i]);
		}
		storepoint=texts;
		for (i=0;i<levels.length-1;i++){
			if (!storepoint[ levels[i] ]) {
				storepoint[ levels[i] ]=[];
			}
			storepoint=storepoint[ levels[i] ];
		}
		storepoint[levels[levels.length-1]]=line;
	}
	//;inepos array is 2 dimensional, book+page*col*line
	//core structure for TPos from/to KPos
	const putLinePos=function(kpos,tpos){
		var parts=Ksanapos.unpack(kpos,this.addressPattern);
		var book=parts[0];
		parts[0]=0;
		var idx=Ksanapos.makeKPos(parts,this.addressPattern);
		idx=idx/Math.pow(2,this.addressPattern.charbits);
		if (!linepos[book]) linepos[book]=[];
		linepos[book][idx]=tpos;
	}

	const putBookPos=function(booknum,tpos){
		bookpos[booknum]=tpos;
	}
	const getLinePos=function(){
		return linepos;
	}
	const getTexts=function(){
		return texts;
	}


	const finalizeLinePos=function(){
		//fill up the gap with previous value,
		//it will be 0 when convert to delta encoding array.
		var i,prev=linepos[0];
		for (i=1;i<linepos.length;i++) {
			if (!linepos[i]) linepos[i]=prev;
			prev=linepos[i];
		}
		return linepos;
	}

	const finalizeTokenPositings=function(){
		var arr=[];
		for (var i in token_postings){
			arr.push([i,token_postings[i]]);
		}
		//sort token alphabetically
		arr.sort(function(a,b){return (a[0]==b[0])?0:((a[0]>b[0])?1:-1)});
		
		var tokens=arr.map(function(item){return item[0]});
		var postings=arr.map(function(item){return item[1]});
		token_postings={};
		return {tokens,postings};
	}
//optimize for jsonrom
//convert to column base single item array
//kpos use vint and make use of stringarray
	const optimize=function(){
		//fill up 
	}

	const putToken=function(tk,tpos){
		if (!token_postings[tk]) token_postings[tk]=[];
		token_postings[tk].push(tpos);
	}

	const buildROM=function(meta){
		var linepos=finalizeLinePos();
		var {tokens,postings}=finalizeTokenPositings();
		return {meta,tokens,postings,texts,linepos,bookpos};
	}
	return {putLine,putLinePos,putBookPos,putField,getField,getField,putToken,
						buildROM};
}
module.exports=Romable;