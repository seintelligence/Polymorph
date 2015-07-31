function arrayify(obj) {
	console.log("arrayify ee");
	if ( !obj ) return [];
	console.log(obj.length);
	if ( obj.length == 1 ) return [obj];
	else if ( obj.length > 1 ) return obj;
	else return [];
}

function echoP(v) {
	console.log("echoP oob");
	console.log(v);
	return v;
}