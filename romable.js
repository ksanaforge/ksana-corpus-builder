var Ksanapos=require("./ksanapos");
const Romable=function(){
	var fields={},texts=[],linetpos=[];

	var rom={texts,fields};
	const putField=function(name,value,kpos){
		if (!fields[name]) fields[name]=[];
		fields[name].push([kpos,value]);
	}
	const getField=function(name,kpos){
		var out=[];
		if (!fields[name])return null;
		for (var i=0;i<fields[name].length;i++) {
			if (fields[name][0]==kpos	) {
				out.push(fields[name[1]]);
			}
		}
		return out;
	}
	const getRawFields=function(name){
		return fields[name];
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
	const putLineTPos=function(kpos,tpos){
		var parts=Ksanapos.unpack(kpos,this.addressPattern);
		var book=parts[0];
		parts[0]=0;
		var idx=Ksanapos.makeKPos(parts,this.addressPattern);
		idx=idx/Math.pow(2,this.addressPattern.charbits);
		if (!linetpos[book]) linetpos[book]=[];
		linetpos[book][idx]=tpos;
	}
	const getLineTPos=function(){
		return linetpos;
	}

	const getTexts=function(){
		return texts;
	}
//optimize for jsonrom
//convert to column base single item array
//kpos use vint and make use of stringarray
	const optimize=function(){

	}

	return {putLine,putLineTPos,putField,getField,getRawFields,getTexts,getLineTPos};
}
module.exports=Romable;