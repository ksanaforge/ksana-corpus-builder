const Romable=function(){
	var fields={},texts=[];

	var rom={texts,fields};
	const putField=function(name,value,kpos){
		kpos=kpos||this.kPos(); //default to current kpos
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
	return {putField,getField,getRawFields};
}
module.exports=Romable;