const importExternalMarkup=function(json){
	const meta=json.shift();
	const fieldname=meta.type;
	for (var i=0;i<json.length;i++) {
		var parts=json[i];
		if (typeof json[i]=="string")  {
			parts=json[i].split("\t");
		}
		const address=parts.shift();
		const r=this.parseRange(address);
		const kpos=r.start==r.end?r.start:r.range;
		const at=this.findArticle(kpos);
		if (at>=0) {
			this.putArticleField(fieldname,parts.join("\t"),kpos,at);
		}
	}
}
const Textutil=require("ksana-corpus/textutil");

const importAFields=function(json){
	var out={};
	for (var fieldname in json) {
		var posvalue=json[fieldname];
		//convert position and sort
		for (var i=0;i<posvalue.length;i++) {
			var parts=posvalue[i];
			if (typeof posvalue[i]=="string")  {
				parts=posvalue[i].split("\t");
			}
			var address=posvalue[i][0];
			var r=Textutil.parseRange(address,this.addressPattern);
			var kpos=r.start==r.end?r.start:r.range;
			posvalue[i][0]=kpos;
		}
		posvalue.sort(function(a,b){return a[0]-b[0]});
		for (var i=0;i<posvalue.length;i++) {
			var kpos=posvalue[i][0];
			var at=this.findArticle(kpos);
			if (at>=0) {
				if (!out[at])out[at]={};
				if (!out[at][fieldname]) out[at][fieldname]={pos:[],value:[]};
				out[at][fieldname].pos.push(kpos);
				out[at][fieldname].value.push(posvalue[i][1]);
			} else {
				console.log("cannot find article",kpos)
			}
		}
	}
	return out;
}
const importKFields=function(json){
	var out={};
	for (var key in json) {
		const data=json[key].sort(function(a,b){return (a[0]==b[0])?0:((a[0]>b[0])?1:-1)});
		var hasvalue=false,haspos=false;
		var value=[],kpos=[],keys=[];
		for (var i=0;i<json[key].length;i++) {
			keys.push(json[key][i][0]);
			value.push(json[key][i][1]);
			if (json[key][i][1])hasvalue=true;
			if (json[key][i][2]) {
				var r=Textutil.parseRange(json[key][2],this.addressPattern);
				var p=r.start==r.end?r.start:r.range;
				kpos.push(p);
				hasvalue=true;
			}			
		}
		out[key]={key:keys};
		if (hasvalue) out[key].value=value;
		if (haspos) out[key].kpos=kpos;
	}
	return out;
}
const importFields=function(json){
	var out={};
	for (var fieldname in json) {
		var posvalue=json[fieldname];
		//convert position and sort
		for (var i=0;i<posvalue.length;i++) {
			var parts=posvalue[i];
			if (typeof posvalue[i]=="string")  {
				parts=posvalue[i].split("\t");
			}
			var address=posvalue[i][0];
			var r=Textutil.parseRange(address,this.addressPattern);
			var kpos=r.start==r.end?r.start:r.range;
			posvalue[i][0]=kpos;
		}
		posvalue.sort(function(a,b){return a[0]-b[0]});
		var pos=[],value=[];
		for (var i=0;i<posvalue.length;i++) {
			pos.push(posvalue[i][0]);
			value.push(posvalue[i][1]);
		}
		out[fieldname]={pos:pos,value:value};
	}
	return out;
}

module.exports={importExternalMarkup:importExternalMarkup
	,importAFields:importAFields
	,importKFields:importKFields
	,importFields:importFields

};