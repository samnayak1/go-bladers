


sudo chmod -R 777 ./hls
sudo chmod -R 777 ./thumbnails
http://localhost:8080/stat
sudo rm -rf hls

http://<domain>/live/<streamKey>.m3u8

ngrok http 3000
docker compose run certbot
# Install certbot
sudo apt install certbot

# Get certificate (standalone mode - temporarily uses port 80)
sudo certbot certonly --standalone -d go-bladers.click -d www.go-bladers.click
or 
sudo certbot certonly --manual --preferred-challenges dns -d go-bladers.click -d www.go-bladers.click
add as TXT record
dig TXT _acme-challenge.go-bladers.click +short
dig TXT _acme-challenge.www.go-bladers.click +short


sudo ufw allow 80
sudo ufw allow 443
sudo ufw allow 1935
sudo crontab -e
0 3 * * * certbot renew --quiet && docker exec rtmp-server nginx -s reload
sudo crontab -l
TODO
~~`1. Fix the folder structure`~~
~~`2. See why the video isnt playing`~~
~~`3. Auth the person who can play`~~
~~`4. Save recording`~~
~~5. schema vaildation~~
6. rate limiting
7. swagger docS
8. cors
9. unit tests
11. api versioning
~~`12. dto`~~
13. View count (low)
~~14. Figure out how to deal with zombie live streams~~
15. Comments and reactions (low)
16. CI/CD
17. To use AI to check sensitive/nudity and ban, Peak Detection, Live transcript, semantic search like and store data in pinecone
18. donations (low)
19. SSL





