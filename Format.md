# Formats

TODO: Make this look better

## .env

- clientId: number, Discord Bot ClientId
- token: string, Discord Bot Token
- ownerId: number, Discord Bot OwnerId
- guildId: number, Discord GuildId you want the bot to run in
- scoresChannelId: number, Discord Channel you want the bot to post into
- scoresUpdateMS: number, This will tell the bot how long it should wait in milliseconds before checking the databse for any chanages to scores
- db_host: IP or Domain, The IP or Domain the database is on
- db_username: string, The username of the user you want to sign-in to (Recommended to be a read-only user as there is currently no plans to make the bot write to database)
- db_password: string, The password of the user you want to sign-in to
- db_name: string, The name of the database you want to use
- db_port: number, The port number the database is running on
