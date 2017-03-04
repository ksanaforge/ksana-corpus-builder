/* output to kdb format*/
const Kdbw=require("./kdbw");
const writeToBlob=function(rom,size,finishcb){
	var kdbw=Kdbw({size:size});
	const u8arr=kdbw.save(rom);
	const blob = new Blob([u8arr],{type:"application/octet-stream"});
	const objurl=URL.createObjectURL(blob);
	finishcb&&finishcb(objurl,blob.size);
	return objurl;
}
const write=function(fn,rom,size,finishcb){
	var kdbw=Kdbw({size:size});
		
	//TODO remove kdbw dependency in corpus
	kdbw.save(rom,null);//,{autodelete:true}

	kdbw.writeFile(fn,function(total,written) {
		var progress=written/total;

		console.log(progress);
		if (finishcb && total==written) finishcb(total);
	});
}

module.exports={write:write,writeToBlob:writeToBlob};