const encodeTreeItem=function(tocobj){
	return (tocobj.depth-(tocobj.subtree||0))+"\t"+tocobj.text+"\t"+tocobj.kpos.toString(36);
}
const decodeTreeItem=function(str){
	const r=str.split("\t");
	return {depth:r[0],text:r[1],kpos:parseInt(r[2],36)};
}
module.exports={encodeTreeItem:encodeTreeItem,decodeTreeItem:decodeTreeItem}