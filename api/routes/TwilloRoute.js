import twilio from "twilio";

// Initialize Twilio client with your Account SID and Auth Token
const client = new twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

// Endpoint to create a room and get the access token
app.post("/api/video/room", async (req, res) => {
  try {
    const room = await client.video.rooms.create({
      uniqueName: 'my-video-room',
      type: 'group',  // You can change this based on your needs (group, peer-to-peer)
      enableTurn: true,
    });

    // Generate access token for the room
    const token = new twilio.jwt.AccessToken(
      process.env.TWILIO_ACCOUNT_SID,
      process.env.TWILIO_API_KEY,
      process.env.TWILIO_API_SECRET,
      { identity: req.body.userId }
    );

    // Video grant to allow the user to join the room
    const videoGrant = new twilio.jwt.AccessToken.VideoGrant({
      room: room.sid,
    });
    token.addGrant(videoGrant);

    res.json({ token: token.toJwt(), roomSid: room.sid });
  } catch (error) {
    console.error("Error creating room:", error);
    res.status(500).json({ error: "Failed to create room" });
  }
});
