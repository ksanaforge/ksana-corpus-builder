/* output to kdb format*/
const Kdbw=require("./kdbw");

const write=function(fn,rom,size,finishcb){
	var kdbw=Kdbw(fn,{size:size});
		
	//TODO remove kdbw dependency in corpus
	kdbw.save(rom,null);//,{autodelete:true}

	kdbw.writeFile(fn,function(total,written) {
		var progress=written/total;
		console.log(progress);
		if (finishcb && total==written) finishcb(total);
	});

}

module.exports={write:write};