yum update

# oh my zsh
yum install -y zsh
sh -c "$(curl -fsSL https://raw.github.com/robbyrussell/oh-my-zsh/master/tools/install.sh)"

echo 'PROMPT="${ret_status} %{$fg[cyan]%}@$USER:$PWD%{$reset_color%} $(git_prompt_info)"' >> .oh-my-zsh/themes/robbyrussell.zsh-theme

# docker
curl -sSL https://get.docker.com/ | sh
usermod -a -G docker $USER
systemctl start docker

# gitlab
wget -O /usr/local/bin/gitlab-runner https://gitlab-runner-downloads.s3.amazonaws.com/latest/binaries/gitlab-runner-linux-amd64
chmod +x /usr/local/bin/gitlab-runner
useradd --comment 'GitLab Runner' --create-home gitlab-runner --shell /bin/bash
gitlab-runner install --user=gitlab-runner --working-directory=/home/gitlab-runner
cp -f ./config/config.toml /etc/gitlab-runner/config.toml
gitlab-runner start

# nodejs
curl --silent --location https://rpm.nodesource.com/setup_10.x | sudo bash -
yum install -y nodejs
yum install gcc-c++ make
curl -sL https://dl.yarnpkg.com/rpm/yarn.repo | sudo tee /etc/yum.repos.d/yarn.repo
yum install -y yarn

# nvm
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.34.0/install.sh | bash
echo 'export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
[ -s "$NVM_DIR/bash_completion" ] && \. "$NVM_DIR/bash_completion"
' >> ~/.zshrc
source ~/.zshrc

# nginx
yum install -y nginx
cp -f ./config/nginx.conf /etc/nginx/nginx.conf
cp -f ./config/dc2_dev.conf /etc/nginx/conf.d/dc2_dev.conf
nginx
