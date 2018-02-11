var tag=new TagInfo(new Uint8Array(45 * TagInfo.numBytesPerPage));
currentPage=null;
var nfcKey=new NfcKey();
var tagAgent=new TagApi();
var usingTagAgent=false;
var uiElementList={};

function bind(elm,method){
	var e=$(elm);
	uiElementList[elm]=method;
	e.val(method());
	e.change(function(){
		try{
			clearError(this);
			method(this.value.toLocaleUpperCase());
		}
		catch(e){
			showError(this,e);
		}
	});

}

function updateAllBindings(){
	for( var key in uiElementList){
		var e=$(key);
		clearError(e);
		e.val(uiElementList[key]());
	}
}

function buildSelect(selectObj,valueMap){
	for(var key in valueMap){
		var opt=document.createElement("option");
		opt.value=key;
		opt.innerHTML=valueMap[key];
		selectObj.append(opt);
	}
}

function parseHex(strHex){
	
	var len=strHex.length;
	lines=strHex.split("\n");
	if( lines.length < 44){
		throw "need all the pages"
	}
	
	var out=new Uint8Array(lines.length * 4);
	var byteIndex=0;
	
	for( var i=0;i< lines.length;i++){
		var line=lines[i];
		if( line.length < 8  ){
			throw "line "+(i+1)+": 8 chars expected"
		}
		for(var c=1;c<line.length;c+=2){
			if( line[c] == " "){
				continue;
			}
			var hexO=line.substring(c-1,c+1);
			if( ! hexO.match(/^[A-F0-9]{2}$/i) ){
				throw "line "+(i+1)+": pos "+c+" invalid,must be HEX i.e (0-9 , A-F)";
			}
			out[byteIndex++]=parseInt(hexO,16);
		}
	}
	
	return out;
}

function loadData(tagData){
	var text="";
		for(var i=0;i<tagData.length;i++){
			if( text.length>4 && (i % 4) == 0){
				text+="\n";
			}
			var tmp=tagData[i].toString(16);
			if( tmp.length == 1){
				text+="0"
			}
			text+=tmp;
		}
		$("#tagHex").val(text);
		updateUIFields(tagData)
}

function sendChangedDataToAgent(){
	var pagesToSend=tag.getDirtyPages();
	
	var keysArray=Object.keys(pagesToSend)
	var data=new Uint8Array(keysArray.length * TagInfo.numBytesPerPage);
	var strPageIndexList=keysArray.join(",")
	var index=0;
	for(var key in pagesToSend){
		
		var startIndex=parseInt(key) * TagInfo.numBytesPerPage;
		
		for( var i=0;i<4;i++){
			data[index++]=tag.tagData[startIndex + i];
		}
	}
	
	tagAgent.writePages(strPageIndexList,data,
	function(data){
		console.log(data);
		alert("tag updated using agent");
	},
	function(msg){
		showError("#agent-address",msg);
	})
	
}

function getTagDataFromAgent(){
	 
	tagAgent.readPages(0,45,
	function(data){
		loadData(data); 
		usingTagAgent=true;
	},
	function(msg){
		showError("#agent-address",msg);
	});
}

function showError(elm,e){
	$(elm)
	.addClass("is-invalid")
	.parent()
	.find(".invalid-feedback")
	.html(e);
}

function clearError(elm){
	$(elm)
	.removeClass("is-invalid")
	.parent()
	.find(".invalid-feedback")
	.html("");	
}

function updateAuthFields(uid){
	var keyInput=$("#key")
	clearError(keyInput);
	try{
		var key=nfcKey.getKey(uid);
		tag.key(key);
		keyInput.val(key);
	}
	catch(e){
		showError(keyInput,e)
	}
	
	var packInput=$("#PACK")
	clearError(packInput)
	try{
		var pack=nfcKey.getPack(uid);
		tag.PACK(pack)
		packInput.val(pack);
	}
	catch(e){
		showError(packInput,e)
	}	
}

function genNewIdHandler(){
	var uid=TagInfo.newUid();
	$("#uid").val(uid);
	updateAuthFields(uid);
	tag.uid(uid);
}

function genNewSerialNumHandler(){
	tag.serialNum(TagInfo.newSerialNum());
	clearError("#serialNum")
	$("#serialNum").val(tag.serialNum())
}

function getChangedPagesData(){
	var pages=tag.getDirtyPages();

}

function hexBoxChanged(){
	try{
		clearError(this);
		data=parseHex(this.value);
		updateUIFields(data);
	}catch(e){
		showError(this,e)
	}

}

function strToInt(v){
	if( v.match(/^\d+$/) ){
		return parseInt(v);
	}else{
		throw "expected number";
	}
}

function changeTab(t){
	pageContainer=currentPage.attr('href')
	$(pageContainer).hide();
	currentPage.removeClass('active');
	
	currentPage=$(this)
	newPage=currentPage.addClass('active').attr('href')
	$(newPage).show();
	
}

function updateDataClickHandler(){
	loadData(tag.getData());
	$("#tagDataTab").click();
	
	if( usingTagAgent ){
		sendChangedDataToAgent();
	}
}

function updateUIFields(data){
	tag=new TagInfo(data);
	updateAllBindings();
	
}

function getQueryVariable(variable) {
	var query = window.location.search.substring(1);
	var vars = query.split("&");
	for (var i=0;i<vars.length;i++) {
		var pair = vars[i].split("=");
		if(pair[0] == variable){return pair[1];}
	}
	return(false);
}

function connectClickHandler(){
	getTagDataFromAgent();
}

function bindUIElements(){
	bind("#uid",
	function(val){
		var key= tag.key().toLocaleUpperCase();
		if(nfcKey.getKey(tag.uid()) != key){
			showError("#key","key invalid");
		}
			
		var pack=tag.PACK().toLocaleUpperCase();
		if(nfcKey.getPack(tag.uid()) != pack){
			showError("#PACK","PACK not valid");
		}
		
		return tag.uid(val);
	});
	
	bind("#key",
	function(val){
		if( val ){
			if(nfcKey.getKey(tag.uid()) != val){
				throw "key not valid"
			}
			tag.key(val);
		}else{
			var key= tag.key().toLocaleUpperCase();
			if(nfcKey.getKey(tag.uid()) != key){
				showError("#key","key invalid");
			}
			return key;
		}		
	});
	bind("#PACK",
	function(val){
		if( val ){
			if(nfcKey.getPack(tag.uid()) != val){
				throw "PACK not valid"
			}
			tag.PACK(val);
		}else{
			var pack=tag.PACK().toLocaleUpperCase();
			if(nfcKey.getPack(tag.uid()) != pack){
				showError("#PACK","PACK not valid");
			}
			return pack;
		}
		
	});
	bind("#fRemaining",
	function(val){
		if(val){
			var v=strToInt(val);
			tag.filamentRemaining(v*1000);
		}else{
			if(!tag.isFilamentUsageChecksumValid()){
				showError("#fRemaining","Checksum incorrect")
			}
			return tag.filamentRemaining()/1000;
		}
		

	});
	

	bind("#fTotal",
	function(val){
		
		clearError("#fTotal");
		var t= tag.filamentTotal(val);
		if(val){
			var r=tag.filamentRemaining();
			var t=tag.filamentTotal();
			if (r == 0 || r>t){
				clearError("#fRemaining");
				$("#fRemaining").val(t/1000);
				tag.filamentRemaining(t);
			}
			
		}
		
		if(!tag.isFilamentTotalValid()){
				showError("#fTotal","total length pages invalid")
		}
		
		return t;
	});
	
	bind("#colour",
	function(val){
		var c= tag.colour(val);
		
		if( tag.isColourValid()){
			clearError("#colour")
		}else{
			showError("#colour","not valid")
		}
		
		return c;
	})
	
	bind("#material",
	function(val){
		var m= tag.material(val);
		
		if( tag.isMaterialValid()){
			clearError("#material")
		}else{
			showError("#material","not valid")
		}
		
		return m;
	})
	
	bind("#serialNum",
	function(val){
		var s= tag.serialNum(val);
		
		if( tag.isSerialNumValid()){
			clearError("#serialNum")
		}else{
			showError("#serialNum","not valid")
		}
		
		return s;
	})
	
	bind("#agent-address",tagAgent.url);
}

$(document).ready(function(){
	$("#tagHex").change(hexBoxChanged)
	$("#genNewId").click(genNewIdHandler);
	$("#genNewSerial").click(genNewSerialNumHandler);
	$("#pageNav li a").click(changeTab)
	currentPage=$("#pageNav li a.active")
	
	buildSelect($("#material"),TagInfo.materialList());
	buildSelect($("#colour"),TagInfo.colourList());
	buildSelect($("#fTotal"),TagInfo.filamentRollSizesList());
	$("#updateData").click(updateDataClickHandler);
	$("#connect").click(connectClickHandler);
	$("#tagData-nextPage").click(function(){$("#tagGUITab").click()});
	
	var agentURL=getQueryVariable("agentURL");
	if(agentURL){
		tagAgent.url(agentURL);
	}
	
	bindUIElements();
});