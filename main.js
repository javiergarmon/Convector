
// Modules
var chokidar = require('chokidar');
var colors   = require('colors');
var execFile = require('child_process').execFile;
var fs       = require('fs');
var notifier = require('node-notifier');
var path     = require('path');

// Constants
const USERPATH = process.env[ process.platform == 'win32' ? 'USERPROFILE' : 'HOME' ];

// Process args
var SOURCE   = process.argv[ 2 ];
var DESTINY  = process.argv[ 3 ];

if( !SOURCE ){
  return console.error( 'Source is not defined'.red );
}

if( !DESTINY ){

  try{
    var config = fs.readFileSync( path.join( USERPATH, '.convector' ) );
  }catch(e){
    return console.error( 'Destiny is not defined'.red );
  }

  try{
    config = JSON.parse( config.toString() );
  }catch(e){
    return console.error( 'Invalid config file'.red );
  }

  if( !config[ SOURCE ] ){
    return console.error( 'Destiny not defined in the config file'.red );
  }

  DESTINY = config[ SOURCE ].user + '@' + config[ SOURCE ].server + ':' + config[ SOURCE ].destiny;
  SOURCE  = config[ SOURCE ].source;

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

    /*if( stderr ){
      console.log( stderr.red );
      process.exit( 1 );
    }*/

    // MAC OS and LINUX support (on linux msg from rsync is "to-chk")
    var count = ( stdout.match( /to-check|to-chk/g ) || [] ).length;

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
