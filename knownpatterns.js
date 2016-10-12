const Ksanapos=require("ksana-corpus/ksanapos");

var knownPatterns={
	"pts":Ksanapos.buildAddressPattern([7,10,6,7]),
	"taisho":Ksanapos.buildAddressPattern([6,13,5,5],3),
	"nanchuan":Ksanapos.buildAddressPattern([7,10,4,6]),
	"taixu":Ksanapos.buildAddressPattern([6,12,5,6])
}
module.exports=knownPatterns;