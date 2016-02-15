
// Modules
var chokidar = require('chokidar');
var colors   = require('colors');
var execFile = require('child_process').execFile;
var notifier = require('node-notifier');
var path     = require('path');

// Process args
const SOURCE  = process.argv[ 2 ];
const DESTINY = process.argv[ 3 ];

if( !SOURCE ){
  return console.error( 'Source is not defined'.red );
}

if( !DESTINY ){
  return console.error( 'Destiny is not defined'.red );
}

// Variables
var watcher = chokidar.watch( SOURCE, {

  ignored       : /[\/\\]\./, // Ignore hidden files with a dot at the beginning
  persistent    : true,
  useFsEvents   : true,
  ignoreInitial : true

});

var firstSync = true;
var syncing   = false;
var syncAgain = false;

// Functions
var sync = function(){

  if( syncing ){
    syncAgain = true;
    return;
  }

  syncAgain = false;
  syncing   = true;

  rsync( function(){

    syncing = false;

    if( syncAgain ){
      sync();
    }

  });

};

var rsync = function( callback ){

  if( firstSync ){
    firstSync = false;
    notifier.notify( { 'title': 'Convector', 'message': 'First sync, it can take a while...', icon: path.join(__dirname, 'img', 'stop.png') }, function(){} );
    console.log( 'First sync, it can take a while...'.yellow );
  }else{
    notifier.notify( { 'title': 'Convector', 'message': 'Syncing...', icon: path.join(__dirname, 'img', 'stop.png') }, function(){} );
    console.log( 'Syncing...'.yellow );
  }

  execFile( 'rsync', [ '-vrcP', '--exclude=".*"', SOURCE, DESTINY ], { cwd : process.cwd, maxBuffer : 1024 * 1024 * 1024 }, function( error, stdout, stderr ){

    if( stderr ){
      console.log( stderr.red );
      process.exit( 1 );
    }

    var count = ( stdout.match( /to-check/g ) || [] ).length;

    notifier.notify( { 'title': 'Convector', 'message': 'Uploaded ' + count + ( count === 1 ? ' file' : ' files' ), icon: path.join(__dirname, 'img', 'go.png'), sound: true }, function(){} );
    console.log( 'Uploaded ' + count + ( count === 1 ? ' file' : ' files' ) );

    callback();

  });

};

// Events
watcher
.on( 'ready', sync )
.on( 'add', sync )
.on( 'change', sync )
.on( 'unlink', sync );
