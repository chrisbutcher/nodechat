nodechat.my_user_name = 'user';
nodechat.has_focus = false;
nodechat.sound_enabled = true;

nodechat.isAlphaNumeric = function (text) {
	return /^[a-zA-Z0-9]+$/.test(text);
}

$(document).ready(function() {

	// Disable messaging form elements initially
	$('#btn-chat-message').attr("disabled", true);
	$('#btn-chat-message').attr("readonly", true);
	$('#txt-message').attr("disabled", true);
	$('#txt-message').attr("readonly", true);

	$('#txt-name').focus();

	// Pressing enter while in login form
	$('#login-form input').keydown(function(e) {
    if (e.keyCode === 13) {
      $('#btn-chat-login').click();
    }
	});

	// Pressing enter while in chat form
	$('#chat-form input').keydown(function(e) {
    if (e.keyCode === 13) {			      
      $('#btn-chat-message').click();
    }
	});

	// Socket.IO starts
  var socket = io.connect(nodechat.server_config.websocket_url, 
  	{ port : nodechat.server_config.websocket_port });

  // Display notices when users log in or out
  socket.on('server_notice', function (data) {
    console.log(data);
    $('#response-table tbody:last').after('<tr><td>' + data.message +
    	'</td><td width="30%">' + data.timestamp + '</td></tr>');
  });

  // Display messages when users chat between each other
  socket.on('server_chat', function (data) {
    console.log(data);
    $('#response-table tbody:last').after('<tr><td>' + data.message +
    	'</td><td width="30%">' + data.timestamp + '</td></tr>');

    if (data.message_from.trim() != nodechat.my_user_name){
    	cancelFlashTitle();
    	flashTitle("New Message!", 20);

    	if (nodechat.has_focus === false && nodechat.sound_enabled === true){
	    	var message_sound = $("#message-sound")[0];
	    	message_sound.play();		
    	}	
    }
  });

  // Handle login button click
	$('#btn-chat-login').on('click', function (e) {		
		nodechat.my_user_name = $('#txt-name').val();

		if (nodechat.my_user_name.trim() === '')
			return false;

		if (nodechat.isAlphaNumeric(nodechat.my_user_name) === false){
			alert('User names can only contain letters or numbers');
			return false;
		}

		$('#txt-name').attr("disabled", true);
		$('#txt-name').attr("readonly", true);
		$('#btn-chat-message').attr("disabled", false);
		$('#btn-chat-message').attr("readonly", false);
		$('#txt-message').attr("disabled", false);
		$('#txt-message').attr("readonly", false);
		$('#btn-chat-login').hide();
		$('#div-login').fadeOut('fast', function() {
			$('#div-message').fadeIn('fast');
			$('#div-message-options').fadeIn('fast');
			$('#txt-message').focus();
		});
		
		socket.emit('set user_data', { 'user_name': nodechat.my_user_name });
	});

	// Handle message send button click
	$('#btn-chat-message').on('click', function (e) {							
		var chat_message = $('#txt-message').val();

		if (chat_message.trim() === '')
			return false;

		cancelFlashTitle();

		socket.emit('chat_message', { 'message': chat_message });

		// After sending a message, reset the chat message textbox, and focus on it
		$('#txt-message').val("");
		$('#txt-message').focus();
	});

	// Handle toggle sound button click
	$('#btn-toggle-sound').on('click', function (e) {
		nodechat.sound_enabled = !nodechat.sound_enabled;

		if (nodechat.sound_enabled === false){
			$('#btn-toggle-sound').html("Sound disabled");
		}
		else {
			$('#btn-toggle-sound').html("Sound enabled");	
		}
	});

	// Monitor user's focus on the chat message textbox
	$('#txt-message').focus(function() {
  	nodechat.has_focus = true;
  	cancelFlashTitle();
	});		

	$('#txt-message').blur(function() {
  	nodechat.has_focus = false;
	});
	
});