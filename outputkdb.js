/* output to kdb format*/
const Kdbw=require("./kdbw");
const writeToBlob=function(rom,size,finishcb){
	var kdbw=Kdbw({size:size});
	const u8arr=kdbw.save(rom);
	const realarr=u8arr.slice(0,kdbw.currentsize());
	const blob = new Blob([realarr],{type:"application/octet-stream"});
	const objurl=URL.createObjectURL(blob);
	finishcb&&finishcb(objurl,blob.size);
	return objurl;
}
const write=function(fn,rom,size,finishcb){
	var kdbw=Kdbw({size:size});
	kdbw.save(rom,null);//,{autodelete:true}
	kdbw.writeFile(fn,function(total,written) {
		if (finishcb && total==written) finishcb(total,fn);
	});
}

module.exports={write:write,writeToBlob:writeToBlob};