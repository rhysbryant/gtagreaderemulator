function TagInfo(td){
	this.tagData=td;
	this.dirtyPages={};
}
	TagInfo.Page8=8*4;
	TagInfo.Page44=44*4;
	TagInfo.numBytesPerPage=4;
	TagInfo.KeyPageIndex=43 * TagInfo.numBytesPerPage;
	TagInfo.PACKPageIndex=44 * TagInfo.numBytesPerPage;
	TagInfo.materialOffset=TagInfo.Page8 + 1;
	TagInfo.materialPageIndex=TagInfo.Page8;
	TagInfo.colourOffset=TagInfo.Page8 + 2;
	TagInfo.colourPageIndex=TagInfo.Page8;
	TagInfo.rollLengthFirstPage=10 * TagInfo.numBytesPerPage;
	TagInfo.rollLengthSecondPage=11 * TagInfo.numBytesPerPage;
	TagInfo.remainingFilamentPage=20 * TagInfo.numBytesPerPage;
	TagInfo.remainingFilamentChecksumPage=21 * TagInfo.numBytesPerPage;
	TagInfo.remainingFilamentChecksumMask=0x54321248
	TagInfo.uidLength=7
	/**
	* returns a slice of the byte array as a string
	**/
	TagInfo.asString=function(data,offset,length){
		var str="";
		for(var i=0;i<length;i++){
			str+=String.fromCharCode(data[i+offset]);
		}
		return str;
	}
	/**
	* returns a slice of the byte array as a hex string
	**/
	TagInfo.asHexString=function(data,offset,length){
		var str="";
		for(var i=0;i<length;i++){
			var tmp=data[i+offset].toString(16);
			if( tmp.length == 1){
				str+="0";
			}
			str+=tmp;
		}
		return str;	
	}
	/**
	* returns a byte array from a hex string
	**/
	TagInfo.fromHexString=function(str){
		if( str.length % 2 != 0){
			throw "string must be even";
		}
		var v=new Uint8Array(str.length /2);
		var index=0;
		for(var i=0;i<str.length;i+=2){
			v[index++]=parseInt(str.substring(i,i+2),16);
		}
		return v;	
	}
	
	TagInfo.prototype.copyToTagData=function(src,offset){
		for(var i=0;i<src.length;i++){
			this.tagData[offset+i]=src[i];
		}
	}
	/**
	* converts the given number of bytes to an int
	**/
	TagInfo.asInt=function(data,startIndex,totalBytes){
		var out=0;
		var i=startIndex;
		for(var b=0;b<totalBytes *8;b+=8){
			out|=(data[i++]<<b);
		}
		return out;
	}
	
	TagInfo.getRandomInt=function(min, max) {
		return Math.floor(Math.random() * (max - min + 1)) + min;
	}
	/**
	* sets or gets the 7 byte uid
	**/
	TagInfo.prototype.uid=function(val){
		if(val){
			var valBytes=TagInfo.fromHexString(val);
			if( valBytes.length != 7 ){
				throw "uid must be 7 bytes"
			}
			var checksum=0
			var vIndex=0;
			for(var i=0;i< 3; i++){
				this.tagData[i]=valBytes[vIndex++];
				checksum^=this.tagData[i];
			}
			this.tagData[3]=checksum;
			checksum=0x88
			for(var i=4;i< 8; i++){
				this.tagData[i]=valBytes[vIndex++];
				checksum^=this.tagData[i];
			}
			this.tagData[8]=checksum;
			
			this.dirtyPages[0]=true;
			this.dirtyPages[1]=true;
			this.dirtyPages[2]=true;
			
		}else{
			var uid=TagInfo.asHexString(this.tagData,0,3);
			uid+=TagInfo.asHexString(this.tagData,4,4);
			return uid.toUpperCase();
		}
	}

	/**
	* generate new uid
	*/
	TagInfo.newUid=function(){
		var uid=new Uint8Array(TagInfo.uidLength);
		for(var i=0;i<=TagInfo.uidLength;i++){
			uid[i]=TagInfo.getRandomInt(0,255);
		}
		var hexStr=TagInfo.asHexString(uid,0,TagInfo.uidLength);
		
		return hexStr;
	}
	/**
	* returns a new random serial number
	**/
	TagInfo.newSerialNum=function(){
		var str="";
		str+=String.fromCharCode(TagInfo.getRandomInt(0x41,0x5D));
		str+=String.fromCharCode(TagInfo.getRandomInt(0x41,0x5D));
		str+=String.fromCharCode(TagInfo.getRandomInt(0x41,0x5D));
		str+=String.fromCharCode(TagInfo.getRandomInt(0x41,0x5D));
		
		str+=String.fromCharCode(TagInfo.getRandomInt(0x30,0x39));
		str+=String.fromCharCode(TagInfo.getRandomInt(0x41,0x43));
		str+=String.fromCharCode(TagInfo.getRandomInt(0x41,0x59));
		
		return str;
	}
	/**
	* returns the serial number of part there of
	**/
	TagInfo.prototype.serialNum=function(val){
		if( val ){
			if( val.length != 7 ){
				throw "unexpected length provided";
			}
			
			var page14=(0x0E * TagInfo.numBytesPerPage);
			this.tagData[page14]=val.charCodeAt(0);
			this.tagData[page14 + 1]=val.charCodeAt(1);
			this.tagData[page14 + 2]=val.charCodeAt(2);
			this.tagData[page14 + 3]=val.charCodeAt(3);
			
			var page9=(0x09 * TagInfo.numBytesPerPage);
			this.tagData[page9 ] =0;
			this.tagData[page9 + 1]=val.charCodeAt(4);
			this.tagData[page9 + 2]=val.charCodeAt(5);
			this.tagData[page9 + 3]=val.charCodeAt(6);
			
			var page13=(0x0D * TagInfo.numBytesPerPage);
			//this.tagData[page13 + 2]=val.charCodeAt(7);
			//this.tagData[page13 + 3]=val.charCodeAt(8);
			
			this.dirtyPages[page14/TagInfo.numBytesPerPage]=true;
			this.dirtyPages[page9/TagInfo.numBytesPerPage]=true;
			
		}else{
			str=  TagInfo.asString(this.tagData,(0x0D * 4)+2,2);
			str+= TagInfo.asString(this.tagData,(0x08 * 4)+1,2);
			str+= TagInfo.asString(this.tagData,(0x0D * 4)+0,2);
			str+= TagInfo.asString(this.tagData,(0x09 * 4)+1,3);
			str+= TagInfo.asString(this.tagData,(0x0E * 4),4);
			return str;
		}
		
	}
	
	TagInfo.prototype.isSerialNumValid=function(){
		//this method needs works
		
		if( this.tagData[TagInfo.page9] != 0 ){
			//return false;
		}else if( this.tagData[TagInfo.page9+1 ] > 0x45 ){
			//return false;
		}else if( this.tagData[TagInfo.page9+1 ] > 0x43 || this.tagData[TagInfo.page9+2 ] < 0x31 ){
			//return false;
		}else if( this.tagData[TagInfo.page9+3 ] > 0x59 ){
			//return false;
		}
		
		return true;
	}
	/**
	* returns a list of all known materials or the material for a given id
	**/	
	TagInfo.materialList=function(index){
		ml={}
		ml[0x50]="PLA";
		/*
		ml[0x41]="ABS";
		ml[0x46]="Tree / PVA";
		
		ml[0x55]="UVCR";
		ml[0x56]="Water-Soluble";
		*/
		if( typeof(index) !='undefined' ){
			return ml[index];
		}else{
			return ml;
		}
	}
	/**
	* get or set the material value
	**/
	TagInfo.prototype.material=function(val){
		if(val){
			if( ! TagInfo.materialList(val) ){
				throw "unsupported value";
			}
			
			this.tagData[TagInfo.materialOffset]=val;
			
			this.dirtyPages[TagInfo.materialPageIndex/TagInfo.numBytesPerPage]=true;
			
		}else{
			return this.tagData[TagInfo.materialOffset];
		}
	}
	/**
	* validates the material value
	**/
	TagInfo.prototype.isMaterialValid=function(){

		return TagInfo.materialList(this.material()) ? true : false;
	}
	/**
	* returns a list of all known colours or the colour for a given id
	**/
	TagInfo.colourList=function(index){
		cl={};
		cl[0x31]="Grey";
		cl[0x32]="Clear Red = 191 ?C";
		cl[0x33]="Clear ";
		cl[0x34]="Bottle Green";
		cl[0x35]="Neon Magenta";
		cl[0x36]="Steel Blue";
		cl[0x37]="Sun Orange";
		cl[0x38]="Pearl White";
		cl[0x41]="Purple";
		cl[0x42]="Blue";
		cl[0x43]="Neon Tangerine";
		cl[0x44]="Virdity";
		cl[0x45]="Olivine = 191 ?C";
		cl[0x46]="Gold";
		cl[0x47]="Green";
		cl[0x48]="Neon Green";
		cl[0x49]="Snow White";
		cl[0x4A]="Neon Yellow";
		cl[0x4B]="Black";
		cl[0x4C]="Violet = 191 ?C";
		cl[0x4D]="Grape Purple";
		cl[0x4E]="Purpurin";
		cl[0x4F]="Clear Yellow = 210 ?C";
		cl[0x50]="Clear Green = 210 ?C";
		cl[0x51]="Clear Tangerine";
		cl[0x52]="Red";
		cl[0x53]="Cyber Yellow";
		cl[0x54]="Tangerine";
		cl[0x55]="Clear Blue = 210 ?C";
		cl[0x56]="Clear Purple";
		cl[0x57]="White = 210 ?C";
		cl[0x58]="Clear Magenta";
		cl[0x59]="Yellow";
		cl[0x5A]="Nature = 191 ?C";
		
		if (typeof(index) != 'undefined'){
			return cl[index];
		}else{
			return cl;
		}
	}
	/**
	* get or set the colour value
	**/	
	TagInfo.prototype.colour=function(val){
		if(val){
			if( !TagInfo.colourList(val) ){
				throw "unsupported value";
			}
			this.tagData[TagInfo.colourOffset]=val;
			this.dirtyPages[TagInfo.colourPageIndex/TagInfo.numBytesPerPage]=true;
		}
		else{
			return this.tagData[TagInfo.colourOffset]
		}
	}
	/**
	* validates the value for colour
	**/
	TagInfo.prototype.isColourValid=function(){
		return TagInfo.colourList(this.colour()) ? true : false;
	}
	
	/**
	* validates the checksum of the remaining filament
	**/
	TagInfo.prototype.isFilamentUsageChecksumValid=function(){
		var r = this.filamentRemaining();
		var cs = TagInfo.asInt(this.tagData,TagInfo.remainingFilamentChecksumPage,4);
		
		return (r ^ TagInfo.remainingFilamentChecksumMask)==cs;
	}
	/**
	 * returns a list of the filament length options
	 */
	TagInfo.filamentRollSizesList=function(index){
		fl={};
		fl[100*1000]="100m";
		fl[200*1000]="200m";
		fl[300*1000]="300m";
		
		if (typeof(index) != 'undefined'){
			return fl[index];
		}else{
			return fl;
		}
	}
	/**
	* returns true if the length pages look valid
	**/
	TagInfo.prototype.isFilamentTotalValid=function(){
		var val1= TagInfo.asInt(this.tagData,TagInfo.rollLengthFirstPage,4);
		var val2= TagInfo.asInt(this.tagData,TagInfo.rollLengthSecondPage,4);
		
		if( val1 != val2 ){
			return false;
		}
		
		var list=TagInfo.filamentRollSizesList();
		
		if( list[val1] ){
			return true;
		}else{
			return false;
		}
	}
	
	/**
	* get or set the total filament value
	**/		
	TagInfo.prototype.filamentTotal=function(val){
		if(val){
			var list=TagInfo.filamentRollSizesList();
			
			if(! list[val] ){
				throw "unsupported value";
			}
			
			this.tagData[TagInfo.rollLengthFirstPage]=(val & 0xFF)
			this.tagData[TagInfo.rollLengthFirstPage+1]=((val>>8) & 0xFF)
			this.tagData[TagInfo.rollLengthFirstPage+2]=((val>>16) & 0xFF)
			this.tagData[TagInfo.rollLengthFirstPage+3]=((val>>24) & 0xFF)
			
			this.tagData[TagInfo.rollLengthSecondPage]=(val & 0xFF)
			this.tagData[TagInfo.rollLengthSecondPage+1]=((val>>8) & 0xFF)
			this.tagData[TagInfo.rollLengthSecondPage+2]=((val>>16) & 0xFF)
			this.tagData[TagInfo.rollLengthSecondPage+3]=((val>>24) & 0xFF)
			
			this.dirtyPages[TagInfo.rollLengthFirstPage/TagInfo.numBytesPerPage]=true;
			this.dirtyPages[TagInfo.rollLengthSecondPage/TagInfo.numBytesPerPage]=true;
		}else{
			return TagInfo.asInt(this.tagData,TagInfo.rollLengthFirstPage,4);
		}
	
	}
	/**
	* get or set the remaining filament
	**/
	TagInfo.prototype.filamentRemaining=function(val){
		if(val){
			this.tagData[TagInfo.remainingFilamentPage]=(val & 0xFF)
			this.tagData[TagInfo.remainingFilamentPage+1]=((val>>8) & 0xFF)
			this.tagData[TagInfo.remainingFilamentPage+2]=((val>>16) & 0xFF)
			this.tagData[TagInfo.remainingFilamentPage+3]=((val>>24) & 0xFF)
			val=val ^ TagInfo.remainingFilamentChecksumMask;
			this.tagData[TagInfo.remainingFilamentChecksumPage]=(val & 0xFF)
			this.tagData[TagInfo.remainingFilamentChecksumPage+1]=((val>>8) & 0xFF)
			this.tagData[TagInfo.remainingFilamentChecksumPage+2]=((val>>16) & 0xFF)
			this.tagData[TagInfo.remainingFilamentChecksumPage+3]=((val>>24) & 0xFF)
			
			this.dirtyPages[TagInfo.remainingFilamentPage/TagInfo.numBytesPerPage]=true;
			this.dirtyPages[TagInfo.remainingFilamentChecksumPage/TagInfo.numBytesPerPage]=true;
			
			return TagInfo.asInt(this.tagData,TagInfo.remainingFilamentPage,4);
		}else{
			return TagInfo.asInt(this.tagData,TagInfo.remainingFilamentPage,4);
		}
		
	}
	/**
	* get or set the tag's key
	**/
	TagInfo.prototype.key=function(val){
		if(val){
			var bytes=TagInfo.fromHexString(val);
			if( bytes.length != 4){
				throw "key must be 4 bytes";
			}
			this.copyToTagData(bytes,TagInfo.KeyPageIndex);
			this.dirtyPages[TagInfo.KeyPageIndex/TagInfo.numBytesPerPage]=true;
			
		}else{
			return TagInfo.asHexString(this.tagData,TagInfo.KeyPageIndex,4);
		}
	}
	/**
	* get or set the tag's PACK
	**/
	TagInfo.prototype.PACK=function(val){
		if(val){
			var bytes=TagInfo.fromHexString(val);
			if( bytes.length != 2){
				throw "key must be 2 bytes";
			}
			this.copyToTagData(bytes,TagInfo.PACKPageIndex);
			this.dirtyPages[TagInfo.PACKPageIndex/TagInfo.numBytesPerPage]=true;
			
		}else{
			return TagInfo.asHexString(this.tagData,TagInfo.PACKPageIndex,2);
		}
	}
	/**
	* returns the tag data including any modifications
	**/
	TagInfo.prototype.getData=function(){
		return this.tagData;
	}
	/**
	* returns pages that have been modified
	**/
	TagInfo.prototype.getDirtyPages=function(){
		return this.dirtyPages;
	}
