"use strict";var crateAdminApp=angular.module("crateAdminApp",["ngRoute","truncate","sql","stats","common","overview","feed","tutorial","console","tables","cluster","tableinfo","nodeinfo","udc"]);crateAdminApp.config(["$routeProvider","$httpProvider",function(a,b){b.defaults.useXDomain=!0,a.when("/",{templateUrl:"views/overview.html",controller:"OverviewController"}).when("/tutorial",{templateUrl:"views/tutorial.html",controller:"TutorialController"}).when("/console",{templateUrl:"views/console.html",controller:"ConsoleController"}).when("/tables",{templateUrl:"views/tables.html",controller:"TableDetailController"}).when("/tables/:schema_name/:table_name",{templateUrl:"views/tables.html",controller:"TableDetailController"}).when("/cluster",{templateUrl:"views/node.html",controller:"NodeDetailController"}).when("/nodes/:node_name",{templateUrl:"views/node.html",controller:"NodeDetailController"}).otherwise({redirectTo:"/"})}]),crateAdminApp.run(["$window","$location",function(a){var b=$.url(a.location.href),c="./"+b.attr("file"),d=b.param("start_twitter"),e=b.param("base_uri");d?(localStorage.setItem("crate.start_twitter","true"),a.location.href=c+"#/tutorial"):e&&(localStorage.setItem("crate.base_uri",e),a.location.href=c+"#/")}]),angular.module("sql",[]).factory("queryResultToObjects",["_object",function(a){return function(b,c){return $.map(b.rows,function(b){return a(c,b)})}}]).factory("_object",function(){return function(a,b){if(a.length!=b.length)return{};for(var c={},d=0;d<a.length;d++)c[a[d]]=b[d];return c}}).factory("SQLQuery",["$http","$location","$log","$q",function(a,b,c,d){function e(a,b,c){this.stmt=a,this.rows=[],this.cols=[],this.rowCount=0,this.duration=0,this.error=c,this.failed=!1,!this.error&&b?(this.rows=b.rows,this.cols=b.cols,this.rowCount=b.rowcount,this.duration=b.duration):this.failed=!0}return e.prototype.status=function(){var a="",b=this.stmt.split(" "),d=b[0].toUpperCase();return d in{CREATE:"",DROP:""}&&(d=d+" "+b[1].toUpperCase()),0==this.failed?(a=d+" OK ("+(this.duration/1e3).toFixed(3)+" sec)",c.info("Query status: "+a)):(a=d+" ERROR ("+(this.duration/1e3).toFixed(3)+" sec)",c.warn("Query status: "+a)),a},e.execute=function(c,f){var g={stmt:c};void 0!=f&&(g.args=f);var h=d.defer(),i=d.defer(),j=i.promise;j.success=function(a){return j.then(function(b){a(b)}),j},j.error=function(a){return j.then(null,function(b){a(b)}),j},j.cancel=function(){h.reject()};var k=b.protocol()+"://"+b.host()+":"+b.port();return null!=localStorage.getItem("crate.base_uri")&&(k=localStorage.getItem("crate.base_uri")),a.post(k+"/_sql",g,{timeout:h.promise}).success(function(a){i.resolve(new e(c,a,null))}).error(function(a,b){var d=null;b>=400&&a.error?(d=new Error(a.error.message),d.status=a.error.status):b>=400?(d=new Error(a),d.status=b):0===b&&(d=new Error("Connection refused"),d.status=b),i.reject(new e(c,a,d))}),j},e}]),angular.module("health",[]).factory("Health",function(){var a={},b=function c(a){this.set=function(a){this.level=isNaN(a)?c.UNKNOWN:a,this.name=c.NAMES[this.level]||"--"},this.toString=function(){return this.name},this.set(a)};return b.NAMES=["good","warning","critical"],b.NAMES.map(function(b,c){a[b]=c}),b.UNKNOWN=-1,b.GOOD=0,b.WARNING=1,b.CRITICAL=2,b.fromString=function(c){return new b(a[c])},b}),angular.module("stats",["sql","health","tableinfo"]).factory("ClusterState",["$http","$interval","$location","$log","SQLQuery","queryResultToObjects","TableList","TableInfo","Health",function(a,b,c,d,e,f,g,h,i){var j,k,l,m={online:!0,tables:[],cluster:[],name:"--",status:"--",load:["-.-","-.-","-.-"],loadHistory:[[],[],[]],version:null},n=5e3,o=100,p=function(){var b=c.protocol()+"://"+c.host()+":"+c.port(),e=localStorage.getItem("crate.base_uri");e&&(b=e),a.get(b+"/").success(function(a){if("object"==typeof a){var b=a.version;m.version={number:b.number,hash:b.build_hash,snapshot:b.build_snapshot},q(!0)}else m.version=null,e||d.warn("If you develop and run Crate Admin UI locally you need to set the base_uri. See README.rst for further information."),q(!1)})},q=function(a){m.online&&!a?(m.online=!1,d.warn("Cluster is offline."),b.cancel(j),b.cancel(k),m.status="--",m.tables=[],m.cluster=[],m.name="--",m.load=["-.-","-.-","-.-"],m.loadHistory=[[],[],[]],m.version=null,l=b(p,n)):!m.online&&a&&(b.cancel(l),m.online=!0,d.info("Cluster is online."),j=b(s,n),s(),k=b(t,n),t())},r=function(a){if(a.length==m.loadHistory.length)for(var b=m.loadHistory,c=0;c<a.length;c++)b[c].push(a[c]),b[c]=b[c].splice(-o,o)},s=function(){m.online&&g.promise.then(null,null,function(a){if(a.success){var b=a.data.tables.reduce(function(a,b){var c=i.fromString(b.health).level;return Math.max(c,a)},0);m.status=new i(b).name,m.tables=a.data.tables}else m.status="--",m.tables=[]})},t=function(){if(m.online){var a=e.execute("select id, name, hostname, port, load, heap, fs, version from sys.nodes");a.success(function(a){m.cluster=f(a,["id","name","hostname","port","load","heap","fs","version"])}).error(function(a){var b=a.error.status;(0===b||404===b)&&q(!1)});var b=e.execute("select    sum(load['1']),    sum(load['5']),    sum(load['15']),    count(*) from sys.nodes");b.success(function(a){var b=a.rows[0];m.load=b.slice(0,3);for(var c=parseFloat(b[3]),d=0;d<m.load.length;d++)m.load[d]/=c;r(m.load)}).error(function(a){var b=a.error.status;(0===b||404===b)&&q(!1)});var c=e.execute("select name from sys.cluster");c.success(function(a){var b=a.rows[0];m.name=b[0]}).error(function(a){var b=a.error.status;(0===b||404===b)&&q(!1)})}};return p(),s(),j=b(s,n),t(),k=b(t,n),{data:m}}]),angular.module("tableinfo",["sql"]).factory("TableInfo",function(){return function(a,b,c){this.partitionedBy=c||[],this.partitioned=this.partitionedBy.length>0,this.shards=a,this.shards_configured=b||0,this.primaryShards=function(){return this.shards.filter(function(a){return a.primary})},this.size=function(){var a=this.primaryShards();return a.reduce(function(a,b){return a+b.size},0)},this.totalRecords=function(){var a=this.primaryShards();return a.reduce(function(a,b){return a+b.sum_docs},0)},this.missingShards=function(){if(this.partitioned&&0===this.startedShards())return 0;var a=this.shards.filter(function(a){return a.state in{STARTED:"",RELOCATING:""}&&a.primary===!0}),b=a.reduce(function(a,b){return b.count+a},0);return Math.max(this.shards_configured-b,0)},this.underreplicatedShards=function(){return this.shards.filter(function(a){var b=a.state in{STARTED:"",RELOCATING:""};return!b&&a.primary===!1}).reduce(function(a,b){return b.count+a},0)},this.unassignedShards=function(){var a=this.shards.filter(function(a){return"UNASSIGNED"==a.state});return a.reduce(function(a,b){return b.count+a},0)},this.startedShards=function(){var a=this.shards.filter(function(a){return"STARTED"==a.state});return a.reduce(function(a,b){return b.count+a},0)},this.underreplicatedRecords=function(){var a=this.primaryShards();return a.length?Math.ceil(a[0].avg_docs*this.underreplicatedShards()):0},this.unavailableRecords=function(){var a=this.shards.filter(function(a){return"STARTED"==a.state});return a.length?Math.ceil(a[0].avg_docs*this.missingShards()):0},this.health=function(){return this.partitioned&&0===this.startedShards()?"good":0===this.primaryShards().length?"critical":this.missingShards()>0?"critical":this.unassignedShards()>0||this.underreplicatedShards()?"warning":"good"},this.asObject=function(){var a={};return a.shards_configured=this.shards_configured,a.health=this.health(),a.shards_started=this.startedShards(),a.shards_missing=this.missingShards(),a.shards_underreplicated=this.underreplicatedShards(),a.records_total=this.totalRecords(),a.records_unavailable=this.unavailableRecords(),a.records_underreplicated=this.underreplicatedRecords(),a.size=this.size(),a.partitioned=this.partitioned,a.partitioned_by=this.partitionedBy,a}}}).factory("TableList",["$timeout","$q","TableInfo","SQLQuery","roundWithUnitFilter","bytesFilter","queryResultToObjects",function(a,b,c,d,e,f,g){var h=b.defer(),i={tables:[]},j=null,k=5e3,l={good:2,warning:1,critical:0,"--":0},m={good:"",warning:"label-warning",critical:"label-danger","--":""},n={good:"panel-success",warning:"panel-warning",critical:"panel-danger","--":"panel-default"},o=function(a,b){return l[a.health]<l[b.health]?-1:l[a.health]>l[b.health]?1:a.name<b.name?-1:a.name>b.name?1:0},p=function(b,d,g){var l=d||[],p=g||[];if(b&&l.length){for(var r=0;r<l.length;r++){var s=l[r],t=p.filter(function(a){return a.table_name===s.name&&a.schema_name==s.schema_name}),u=new c(t,s.shards_configured,s.partitioned_by),v=u.asObject();$.extend(s,v),s.health_label_class=m[s.health],s.health_panel_class=n[s.health],s.type_display_name="blob"==s.schema_name?"Blob":"Record";var w=e(s.records_total,1)+" Records ("+f(s.size)+") / "+s.replicas_configured+" Replicas / "+s.shards_configured+" Shards ("+s.shards_started+" Started)";s.records_unavailable?w=e(s.records_unavailable,1)+" Unavailable Records / "+w:s.shards_underreplicated&&(w=s.shards_underreplicated+" Underreplicated Shards / "+w),s.records_underreplicated&&(w=s.records_underreplicated+" Underreplicated Records / "+w),s.summary=w}i.tables=l.sort(o)}else i.tables=[];h.notify({success:b,data:i}),j=a(q,k)},q=function(){a.cancel(j);var b="select table_name, number_of_shards, number_of_replicas, schema_name, partitioned_by from information_schema.tables where schema_name not in ('information_schema', 'sys')",c='select table_name, schema_name, sum(num_docs), "primary", avg(num_docs), count(*), state, sum(size) from sys.shards group by table_name, schema_name, "primary", state order by table_name, "primary", state';d.execute(b).success(function(a){var b=g(a,["name","shards_configured","replicas_configured","schema_name","partitioned_by"]);d.execute(c).success(function(a){var c=g(a,["table_name","schema_name","sum_docs","primary","avg_docs","count","state","size"]);p(!0,b,c)}).error(function(){p(!0,b)})}).error(function(){p(!1)})};return q(),{data:i,promise:h.promise}}]),angular.module("nodeinfo",[]).factory("NodeHealth",function(){var a=function b(a){var c=function(a){return a>b.THRESHOLD_CRITICAL?2:a>b.THRESHOLD_WARNING?1:0},d=Math.max(a.fs.used_percent,a.heap.used_percent),e=c(d);this.value=e,this.status=["good","warning","critical"][e]};return a.THRESHOLD_CRITICAL=98,a.THRESHOLD_WARNING=90,a}).provider("NodeListInfo",function(){var a={sort:{col:["health_value","name"],desc:!1},sortBy:function(a){0===this.sort.col.indexOf(a)?this.sort.desc=!this.sort.desc:(this.sort.col=this.sort.col.reverse(),this.sort.desc=!1)},sortClass:function(a){return 0===this.sort.col.indexOf(a)?this.sort.desc?"fa fa-chevron-down":"fa fa-chevron-up":""}};this.$get=function(){return a}}).factory("prepareNodeList",["NodeHealth",function(a){var b={good:"",warning:"label-warning",critical:"label-danger","--":""};return function(c){for(var d=[],e=0;e<c.length;e++){var f=angular.copy(c[e]),g=window.location.protocol+"//"+(f.hostname||"localhost")+":"+f.port.http;f.address=g.toLowerCase(),f.health=new a(f),f.health_value=f.health.value,f.health_label_class=b[f.health.status],f.health_panel_class=b[f.health.status],f.heap.used_percent=100*f.heap.used/f.heap.max,f.heap.free_percent=100-f.heap.used_percent,d.push(f)}return d}}]).factory("compareByHealth",function(){return function(a,b){return a.health.value<b.health.value?-1:a.health.value>b.health.value?1:a.name<b.name?-1:a.name>b.name?1:0}}),angular.module("udc",[]).factory("UdcSettings",function(){var a="crate.user_email";return{SegmentIoToken:"vd4x4hv637",Email:{get:function(){return localStorage.getItem(a)||null},set:function(b){return b?(localStorage.setItem(a,b),!0):!1},unset:function(){localStorage.removeItem(a)}}}}).factory("Uid",function(){var a=function(a){this.uid=a};return a.create=function(b){return new a(b)},a.NAME="uid",a.prototype.isValid=function(){return this.uid?null!==this.uid.match(/^[a-f0-9]{32}$/):!1},a.prototype.toString=function(){return this.uid},a}).factory("UidLoader",["$q","Uid",function(a,b){var c=function(a){var b=document.createElement("iframe");return b.id="ifr"+(new Date).getTime(),b.style.width="0px",b.style.height="0px",b.src=a,document.getElementsByTagName("body")[0].appendChild(b),b};return{load:function(){var d="cdn.crate.io",e="/libs/crate/uid.html",f=a.defer(),g=f.promise;g.success=function(a){return g.then(a,null,null),g},g.error=function(a){return g.then(null,a,null),g},g.notify=function(a){return g.then(null,null,a),g},window.addEventListener("message",function(a){if(a.origin.match(d)){f.notify(a);var c=b.create(a.data[b.NAME]);c.isValid()?f.resolve(c):f.reject(new Error("Cookie failed to load"))}},!1);var h="https:"===window.location.protocol?"https:":"http:";return c(h+"//"+d+e),g}}}]),angular.module("common",["stats","udc"]).controller("StatusBarController",["$scope","$log","$location","$sce","ClusterState",function(a,b,c,d,e){var f={good:"",warning:"label-warning",critical:"label-danger","--":"label-danger"},g="https://crate.io/docs",h=function(a){return d.trustAsResourceUrl(g+(a?"/en/"+a.number:"/stable")+"/")};a.cluster_color_label="label-default",a.$watch(function(){return e.data},function(b){var c=[],d=b.cluster.filter(function(a){var b=!1;if(a.version){var d=a.version.build_hash;b=-1==c.indexOf(d),c.push(d)}return b}).map(function(a){return a.version.number});a.versions=d,a.version_warning=d.length>1,a.cluster_state=b.status,a.cluster_name=b.name,a.num_nodes=b.cluster.length,a.cluster_color_label=f[b.status],a.load1="-.-"==b.load[0]?b.load[0]:b.load[0].toFixed(2),a.load5="-.-"==b.load[1]?b.load[1]:b.load[1].toFixed(2),a.load15="-.-"==b.load[2]?b.load[2]:b.load[2].toFixed(2),a.version=b.version,a.docs_url=h(b.version)},!0),$("[rel=tooltip]").tooltip({placement:"bottom"})}]).controller("NavigationController",["$scope","$location",function(a,b){a.isActive=function(a){return"/"==a?a===b.path():b.path().substr(0,a.length)==a}}]).directive("fixBottom",function(){return function(a,b){var c=$(b),d=$(".side-nav .navbar-nav"),e=$(window),f=function(){a.fixBottom=d.offset().top+d.height()+c.height()<e.height()};e.on("resize",f),f()}}).controller("HelpMenuController",["$scope","UidLoader","UdcSettings",function(a,b,c){var d=null;analytics.load(c.SegmentIoToken),analytics.ready(function(){var a=analytics.user();d={id:a.id(),traits:a.traits()}});var e=function(a){var b=a.email&&a.uid&&a.enabled;b&&(analytics.identify(a.uid,{email:a.email},{userAgent:navigator.userAgent,integrations:{All:!1,Intercom:{}}}),analytics.page())};a.user={email:c.Email.get(),uid:null,enabled:null!==c.Email.get()},a.enable=function(b){c.Email.set(b.email),a.user.enabled=!0,e(a.user)},a.disable=function(){c.Email.unset(),a.user.enabled=!1,a.user.email=null,analytics.reset(),$("#intercom-container").remove()},b.load().success(function(b){a.user.uid=b.toString(),e(a.user)}).error(function(a){console.warn(a)}).notify(function(){})}]),angular.module("feed",["stats"]).factory("FeedService",["$http",function(a){var b="/feed/json?callback=JSON_CALLBACK";return{parse:function(c){return a.jsonp(c+b,{cache:!1})}}}]).factory("NotificationService",["$http",function(){var a=null,b="crate.readNotifications";return{readItems:function(){if(null===a){var c=localStorage.getItem(b);a=c?JSON.parse(c):[]}return a},markAsRead:function(c){var d=this.readItems();d.push(c),a=d,localStorage.setItem(b,JSON.stringify(d))}}}]).controller("NotificationsController",["$scope","$sce","$http","$filter","FeedService","NotificationService","ClusterState",function(a,b,c,d,e,f,g){var h,i="https://crate.io/blog/category/developernews",j=5,k="https://crate.io/versions.json";a.showUpdate=!1,a.numUnread=0,a.entries=[],a.blog_url=i;var l=function(b){if("all"===b){for(var c=a.entries,d=0;d<c.length;d++)f.markAsRead(c[d].id);a.numUnread=0}else b&&(f.markAsRead(b.id),a.numUnread=Math.max(0,a.numUnread-1))},m=function(a){for(var b=f.readItems(),c=a.id,d=0;d<b.length;d++)if(b[d]===c)return!0;return!1};c.get(k,{withCredentials:!0}).success(function(a){a&&a.crate&&(h=a.crate)}),e.parse(i,j).then(function(c){var e=d("characters");if(200===c.status&&c.data.length>0){var f=c.data.splice(0,j),g=f.length;f.map(function(a){a.title=b.trustAsHtml(a.title),a.preview=b.trustAsHtml(e(a.excerpt,150)),a.timestamp=new Date(a.date),a.id=a.timestamp.getTime().toString(32),m(a)&&g--}),a.entries=f,a.numUnread=g}}),a.$watch(function(){return g.data},function(b){a.showUpdate=b.version&&h&&h>b.version.number,a.stableVersion=h,a.serverVersion=b.version?b.version.number:"",a.noNotifications=!a.showUpdate&&0===a.entries.length},!0),a.noNotifications=!0,a.isRead=m,a.markAsRead=l}]),angular.module("tutorial",["sql"]).controller("TutorialController",["$scope","$location","$log","$timeout","$routeParams","SQLQuery",function(a,b,c,d,e,f){var g="https://twitter.crate.io/api/v1",h=[window.location.protocol,window.location.host].join("//")+window.location.pathname;a.count=0,a.importing=!1;var i=function(){this.storeTweet=function(a){if(a&&a.id){var b="insert into tweets values ($1, $2, $3, $4, $5, $6)";f.execute(b,[a.created_at,a.id,a.retweeted,a.source,a.text,a.user])}},this.createTable=function(){var a="create table tweets (                     id string primary key,                     created_at timestamp,                     text string INDEX using fulltext,                     source string INDEX using fulltext,                     retweeted boolean,                     \"user\" object(strict) as (                         created_at timestamp,                         verified boolean,                         followers_count integer,                         id string,                         statuses_count integer,                         description string INDEX using fulltext,                         friends_count integer,                         location string INDEX using fulltext                     ) ) with (number_of_replicas = '0-all')";return f.execute(a)},this.start=function(){if(!this.request){this.count=0,a.importing=!0;var b,c=this,d="",e=this.createTable(),f=function(){c.request=$.ajax(g+"/sample?origin="+encodeURIComponent(h),{type:"GET",xhrFields:{withCredentials:!0},crossDomain:!0,xhr:function(){var e=new window.XMLHttpRequest;return e.addEventListener("progress",function(e){b=e.target.responseText.substring(d.length),b=b.split("\n"),b=$.map(b,function(a){try{return JSON.parse(a)}catch(b){return null}}),b=b.filter(function(a){return null!=a}),$.each(b,function(a,b){c.storeTweet(b)}),c.count+=b.length,a.count=c.count,d=e.target.responseText}),e}}).fail(function(a){401===a.status&&(window.location=g+"/auth?origin="+encodeURIComponent(h))})};e.success(f),e.error(f)}},this.running=function(){return this.request&&"pending"===this.request.state()},this.stop=function(){this.request&&this.request.abort(),this.request=null,a.importing=!1}},j=new i;"true"===localStorage.getItem("crate.start_twitter")&&(localStorage.removeItem("crate.start_twitter"),j.start()),a.startImport=function(){j.start()},a.stopImport=function(){j.stop()},a.$on("$destroy",function(){j.stop()})}]),angular.module("overview",["stats"]).controller("OverviewController",["$scope","$location","$log","$timeout","ClusterState",function(a,b,c,d,e){var f={good:"panel-success",warning:"panel-warning",critical:"panel-danger","--":"panel-default"};a.available_data="--",a.records_unavailable="--",a.replicated_data="--",a.records_total="--",a.records_underreplicated="--",a.cluster_state="--",a.cluster_color_class="panel-default",a.$watch(function(){return e.data},function(b){if(a.cluster_state=b.status,a.cluster_color_class=f[b.status],g(b.loadHistory),!b.tables||!b.tables.length)return a.available_data=100,a.records_unavailable=0,a.replicated_data=100,a.records_total=0,void(a.records_underreplicated=0);var c=b.tables;a.records_underreplicated=c.reduce(function(a,b){return b.records_underreplicated+a},0),a.records_unavailable=c.reduce(function(a,b){return b.records_unavailable+a},0),a.records_total=c.reduce(function(a,b){return b.records_total+a},0),a.records_total>0?(a.replicated_data=Math.max(0,a.records_total-a.records_underreplicated)/a.records_total*100,a.available_data=Math.max(0,a.records_total-a.records_unavailable)/a.records_total*100):(a.replicated_data=100,a.available_data=100)},!0);var g=function(a){for(var b=[],c=0;c<a.length;c++){for(var d=a[c],e=[],f=0;f<d.length;f++)e.push([f,d[f]]);b.push(e)}$.plot($("#load-graph"),[{label:"cluster load",data:b[0],color:"#676767"}],{series:{shadowSize:0,points:{show:!0}},lines:{show:!0,fill:!0},yaxis:{min:0},xaxis:{min:0,max:100,show:!1}}).draw()};$("[rel=tooltip]").tooltip({placement:"top"})}]),angular.module("console",["sql"]).directive("console",["SQLQuery","$timeout",function(a){return{restrict:"A",controller:["$scope",function(b){var c=null,d=[],e="";b.error={hide:!0,message:""},b.info={hide:!0,message:""},this.setInputScope=function(a){c=a};var f=Ladda.create(document.querySelector("button[type=submit]"));b.storeInLocalStorageChanged=function(){localStorage.setItem("crate.console.store_queries",j===!0?"1":"0")};var g=function(){var a=localStorage.getItem("crate.console.query_list");d=a?JSON.parse(a):[]},h=function(a){j&&g(),d[d.length-1]!==a&&d.push(a+";"),j&&localStorage.setItem("crate.console.query_list",JSON.stringify(d)),c.recentCursor=-1};b.hide=function(a){a.hide=!0,a.message=""},b.toggleOptions=function(){$("#console-options").slideToggle(),b.info.hide=!0,b.info.message=""},b.clearLocalStorage=function(){var a=JSON.parse(localStorage.getItem("crate.console.query_list")||"[]");localStorage.setItem("crate.console.query_list",JSON.stringify([])),c.recentCursor=0,d=[];var e=1==a.length?"1 entry in console history has been cleared.":a.length+" entries in console history have been cleared.";b.info.message=e,b.info.hide=!1};var i=localStorage.getItem("crate.console.store_queries")||"1",j=!!parseInt(i);g();var k=function(d){var e=d.replace(/^\s+|\s+$/g,"");""!==e&&(e=e.replace(/([^;]);+$/,"$1"),e.match(/^\s*select\s/gi)&&!e.match(/limit\s+\d+/gi)&&(e+=" limit 100"),h(e),f.start(),a.execute(e).success(function(a){f.stop(),b.error.hide=!0,b.error.message="",b.info.hide=!0,b.info.message="",b.renderTable=!0,b.resultHeaders=[];for(var d in a.cols)b.resultHeaders.push(a.cols[d]);b.rows=a.rows,b.status=a.status(),b.statement=e+";",c.updateInput(b.statement)}).error(function(a){f.stop(),b.error.hide=!1,b.renderTable=!1,b.error.message=a.error.message,b.status=a.status(),b.rows=[],b.resultHeaders=[]}))};this.recentQueries=d,this.execute=k,this.updateStatement=function(a){e=a},b.execute=function(){k(e)}}]}}]).directive("cli",["$timeout",function(a){return{restrict:"E",transclude:!0,templateUrl:"views/editor.html",scope:{mimeType:"=",theme:"="},require:"^console",link:function(b,c,d,e){e.setInputScope(b),b.recentCursor=0,b.updateInput=function(a){i(a)};var f="",g="",h=$("textarea",c)[0],i=function(b){b&&j.setValue(b),a(function(){j.execCommand("selectAll")},10)},j=CodeMirror.fromTextArea(h,{mode:d.mimeType,theme:d.theme});j.on("change",function(a){f=a.getValue(),e.updateStatement(f)}),j.on("keydown",function(a,c){var d=c.target.selectionStart,h=e.recentQueries.length,j=f.indexOf(";"),k=a.getCursor(),l=a.getSelection();c.shiftKey||38!==c.keyCode?c.shiftKey||40!==c.keyCode?13===c.keyCode&&c.shiftKey?-1!=j&&(c.preventDefault(),e.execute(f),g=""):b.recentCursor=0:(d>=c.target.textLength||0===d&&c.target.selectionEnd===f.length)&&h+b.recentCursor<h&&(b.recentCursor++,f=e.recentQueries[h+b.recentCursor]||g,i(f)):(0===k.ch&&0===k.line||0===k.line&&l===f)&&(0===b.recentCursor&&(g=f),b.recentCursor--,f=e.recentQueries[h+b.recentCursor],i(f))})}}}]).controller("ConsoleController",["$scope","$http","$location","SQLQuery","$log","$timeout",function(){}]),angular.module("tables",["stats","sql","common","tableinfo"]).provider("TabNavigationInfo",function(){this.collapsed=[!1,!0],this.$get=function(){var a=this.collapsed;return{collapsed:a,toggleIndex:function(b){a[b]=!a[b]}}}}).factory("PartitionsTableController",function(){return function(){this.headers=[["health","Health"],["partition_ident","Ident"],["replicas_configured","Config. Replicas"],["shards_configured","Config. Shards"],["shards_started","Started Shards"],["shards_missing","Missing Shards"],["shards_underreplicated","Underr. Shards"],["records_total","Total Records"],["records_unavailable","Unavail. Records"],["records_underreplicated","Underr. Records"],["size","Size"]],this.data=[],this.sort={col:"partition_ident",desc:!1},this.setPartitions=function(a){this.data=a},this.sortByColumn=function(a){this.sort.col===a?this.sort.desc=!this.sort.desc:(this.sort.col=a,this.sort.desc=!1)},this.selected=function(a){return a===this.sort.col?this.sort.desc?"fa fa-chevron-down":"fa fa-chevron-up":""}}}).controller("TableDetailController",["$scope","$location","$log","$timeout","$route","SQLQuery","queryResultToObjects","roundWithUnitFilter","bytesFilter","TableList","TableInfo","TabNavigationInfo","PartitionsTableController",function(a,b,c,d,e,f,g,h,i,j,k,l,m){var n={},o=5e3,p=null,q={good:"",warning:"label-warning",critical:"label-danger","--":""},r={name:"Tables (0 found)",summary:"",health:"--",health_label_class:"",health_panel_class:"",records_total:0,records_replicated:0,records_underreplicated:0,records_unavailable:0,shards_configured:0,shards_started:0,shards_active:0,shards_missing:0,shards_underreplicated:0,replicas_configured:"0",size:0},s=e.current;a.$on("$locationChangeSuccess",function(){if(t(),"TableDetailController"===e.current.$$route.controller){var a=e.current.params;u(a.schema_name,a.table_name),e.current=s,e.current.params=a}}),$("[rel=tooltip]").tooltip({placement:"top"}),a.toggleSidebar=function(){$("#wrapper").toggleClass("active")};var t=function(){d.cancel(p);for(var a in n){var b=n[a];b.cancel()}n={}},u=function(b,c){a.ptCtlr=new m,a.nothingSelected=!1,a.renderSiderbar=!0,a.$watch(function(){return j.data},function(d){var f=d.tables;if(f.length>0){var g=f.filter(function(a){return a.name===c&&a.schema_name===b});g=g.length?g[0]:f[0],a.table=g,a.table_label=g.name,"blob"==g.schema_name?a.table_label="BLOB: "+g.name:"doc"!=g.schema_name&&(a.table_label=g.schema_name+"."+g.name),a.nothingSelected=null===g,a.renderSidebar=!0,a.table.partitioned&&e()}else a.table=r,a.table_label=r.name,a.nothingSelected=!1,a.renderSidebar=!1,a.renderSchema=!1,a.renderPartitions=!1},!0);var e=function(){if(d.cancel(p),c&&b){var e="r"+(new Date).getTime(),i='select partition_ident, sum(num_docs), "primary", avg(num_docs), count(*), state, sum(size) from sys.shards where schema_name = $1 and table_name = $2 and partition_ident != \'\' group by partition_ident, "primary", state',j=f.execute(i,[b,c]).success(function(b){if("undefined"!=typeof n[e]){for(var c=g(b,["partition_ident","sum_docs","primary","avg_docs","count","state","size"]),d=c.reduce(function(a,b){var c=b.partition_ident;return-1===a.indexOf(c)&&a.push(c),a},[]),f=[],i=0;i<d.length;i++){var j=d[i],l=c.filter(function(a){return a.partition_ident===j}),m=new k(l,a.table.shards_configured),o=m.asObject();o.partition_ident=j,o.replicas_configured=a.table.replicas_configured,o.health_label_class=q[o.health],f.push(o)}delete n[e],h(!0,f)}}).error(function(){delete n[e],h(!1,[])});n[e]=j}},h=function(b,c){a.ptCtlr.data=c,a.renderPartitions=b,a.renderSchema=b,p=d(e,o)};if(c&&b){var i="select column_name, data_type from information_schema.columns where schema_name = $1 and table_name = $2";f.execute(i,[b,c]).success(function(b){a.schemaHeaders=b.cols,a.schemaRows=b.rows,a.renderSchema=!0}).error(function(){a.renderSchema=!1})}a.$on("$destroy",function(){d.cancel(p)}),a.table=null,a.renderSidebar=!0,a.renderSchema=!1,a.renderPartitions=!1};u(e.current.params.schema_name,e.current.params.table_name)}]).controller("TableListController",["$scope","$route","TableList","TabNavigationInfo",function(a,b,c,d){a.$on("$locationChangeSuccess",function(){if("TableDetailController"===b.current.$$route.controller){var a=b.current.params;e(a.schema_name,a.table_name)}});var e=function(b,e){a.renderSidebar=!0,a.$watch(function(){return c.data},function(c){var d=c.tables,f=d.length>0;if(a.renderSidebar=f,f){e&&b||(e=d[0].name,b=d[0].schema_name);var g=[];for(var h in d){var i=d[h].schema_name;"doc"==i||"blob"==i||g.indexOf(i)>-1||g.push(i)}a.tables=[{display_name:"Doc Tables",tables:d.filter(function(a){return"doc"==a.schema_name}),schema_name:"doc"}];for(var h in g){var i=g[h];a.tables.push({display_name:i+" Tables",tables:d.filter(function(a){return a.schema_name==i}),schema_name:i})}a.tables.push({display_name:"Blob Tables",tables:d.filter(function(a){return"blob"==a.schema_name}),schema_name:"blob"})}else a.tables=[]},!0),a.isActive=function(a,c){return c===e&&a===b},a.startedShardsError=function(a){return a.partitioned&&0===a.shards_started?!1:a.shards_started<a.shards_configured},a.toggleElements=function(a){$("#nav-tabs-"+a).collapse("toggle"),$("#nav-tabs-header-"+a+" i.fa").toggleClass("fa-caret-down").toggleClass("fa-caret-right"),d.toggleIndex(a)},a.isCollapsed=function(a){return d.collapsed[a]}};e(b.current.params.schema_name,b.current.params.table_name)}]),angular.module("cluster",["stats","sql","common","nodeinfo"]).controller("NodeListController",["$scope","$route","ClusterState","prepareNodeList","NodeHealth","NodeListInfo","compareByHealth",function(a,b,c,d,e,f,g){a.nodes=[],a.selected=null,a.percentageLimitYellow=e.THRESHOLD_WARNING,a.percentageLimitRed=e.THRESHOLD_CRITICAL;var h=null,i=null,j=null;a.$on("$locationChangeSuccess",function(){"NodeDetailController"===b.current.$$route.controller&&k(b.current.params.node_name)});var k=function(b){j=b,h&&h(),h=a.$watch(function(){return c.data},function(b){var c=angular.copy(b.cluster);i=b.version;var e=c.length>0;a.renderSidebar=e;var f=d(c);if(e){f=f.sort(g);var h=f.map(function(a){return a.name});if(j&&h.indexOf(j)>=0){var k=f.filter(function(a){return a.name===j});a.selected=k.length?k[0]:f[0]}else a.selected=f[0],j=f[0].name}else a.selected=null;a.nodes=f},!0)};a.sort=f.sort,a.sortBy=f.sortBy,a.sortClass=f.sortClass,a.isActive=function(a){return a.name===j},a.isSameVersion=function(a){return i?a.build_hash===i.hash:!0},k(b.current.params.node_name)}]).controller("NodeDetailController",["$scope","$interval","$route","$http","$filter","ClusterState","prepareNodeList","NodeHealth","compareByHealth",function(a,b,c,d,e,f,g,h,i){a.node=null,a.percentageLimitYellow=h.THRESHOLD_WARNING,a.percentageLimitRed=h.THRESHOLD_CRITICAL;var j={name:"Cluster is not reachable",id:"",summary:[],health:"--",health_label_class:"",health_panel_class:"",hostname:"--",address:"",version:{number:"--",build_hash:"",build_snapshot:!1},heap:{total:0,free:0,used:0,used_percent:0,free_percent:0},fs:{total:0,available:0,used:0,available_percent:0,used_percent:0}},k=null,l=null,m=c.current;a.$on("$locationChangeSuccess",function(){if("NodeDetailController"===c.current.$$route.controller){var a=c.current.params;o(a.node_name),c.current=m,c.current.params=a}});var n=function(a){var b={total:0,available:0,used:0,available_percent:0,used_percent:0};if(a.fs.data){for(var c=[],d=0;d<a.fs.data.length;d++)c.push(a.fs.data[d].dev);for(var e=0;e<a.fs.disks.length;e++){var f=a.fs.disks[e],g=c.indexOf(f.dev)>-1;g&&(b.total+=f.size,b.available+=f.available,b.used+=f.used)}b.available_percent=100*b.available/b.total,b.used_percent=100*b.used/b.total}return b},o=function(b){l&&l(),l=a.$watch(function(){return f.data},function(c){for(var d=angular.copy(c.cluster),e=0;e<d.length;e++)d[e].fs=n(d[e]);k=c.version;var f=d.length>0;a.renderSidebar=f;var h=g(d);if(f){h=h.sort(i);var l=h.map(function(a){return a.name});if(b&&l.indexOf(b)>=0){var m=h.filter(function(a){return a.name==b});a.node=m.length?m[0]:h[0]}else a.node=h[0]}else a.node=angular.copy(j)},!0)};$("[rel=tooltip]").tooltip({placement:"top"}),a.toggleSidebar=function(){$("#wrapper").toggleClass("active")},a.isSameVersion=function(a){return k?a.build_hash===k.hash:!0},o(c.current.params.node_name)}]),angular.module("common").filter("capitalize",function(){return function(a){return a.substring(0,1).toUpperCase()+a.substring(1)
}}),angular.module("common").filter("floor",["$filter",function(a){return function(b,c){var d=Math.pow(10,c);return a("number")(Math.floor(b*d)/d,c)}}]).filter("roundWithUnit",["$filter","$sce",function(a,b){return function(c,d){void 0==d&&(d=3);var e="";return e=Math.abs(Number(c))>=1e9?a("number")(Math.abs(Number(c))/1e9,d)+" Billion":Math.abs(Number(c))>=1e6?a("number")(Math.abs(Number(c))/1e6,d)+" Million":a("number")(Math.abs(Number(c)),0),b.trustAsHtml(e)}}]).filter("bytes",["$sce",function(a){return function(b,c){if(0==b||isNaN(parseFloat(b))||!isFinite(b))return"-";"undefined"==typeof c&&(c=1);var d=["bytes","kB","MB","GB","TB","PB"],e=Math.floor(Math.log(b)/Math.log(1024)),f=(b/Math.pow(1024,Math.floor(e))).toFixed(c)+" "+d[e];return a.trustAsHtml(f)}}]);