# How to install

## iTerm2

    brew cask install iterm2
    
Or, if you do not have homebrew (you should ;)): [Download](http://www.iterm2.com/downloads.html) and install iTerm2 

iTerm2 has better color fidelity than the built in Terminal, so your themes will look better.
    
Get the iTerm color settings

- [Solarized Dark theme](https://raw.githubusercontent.com/mbadolato/iTerm2-Color-Schemes/master/schemes/Solarized%20Dark%20-%20Patched.itermcolors) (patched version to fix the bright black value)
- [Solarized Light theme](https://raw.githubusercontent.com/altercation/solarized/master/iterm2-colors-solarized/Solarized%20Light.itermcolors)
- [More themes @ iterm2colorschemes](http://iterm2colorschemes.com/)
    
Just save it somewhere and open the file(s). The color settings will be imported into iTerm2. Apply them in iTerm through iTerm → preferences → profiles → colors → load presets. You can create a different profile other than `Default` if you wish to do so.

# Oh My Zsh 

More info here: https://github.com/robbyrussell/oh-my-zsh

## Install with curl
    
    sh -c "$(curl -fsSL https://raw.githubusercontent.com/robbyrussell/oh-my-zsh/master/tools/install.sh)"
    
When the installation is done, edit `~/.zshrc` and set `ZSH_THEME="agnoster"`

## Powerlevel9k / Powerlevel10k

Why Powerlevel10k? Well, because it's a drop-in replacement for Powerlevel9k, just a lot faster to render your prompt. `ls` feels fast again!

So if you prefer the Powerlevel10k look with added info such as exit codes and timestamps on the right, run:

    git clone https://github.com/romkatv/powerlevel10k.git $ZSH_CUSTOM/themes/powerlevel10k

Then edit your `~/.zshrc` and set `ZSH_THEME="powerlevel10k/powerlevel10k"`.

Also add the following: `POWERLEVEL9K_MODE="awesome-patched"`

Powerlevel10k offers a whole lot more, best is to [check its project page](https://github.com/bhilburn/powerlevel9k/wiki/Show-Off-Your-Config).

## Install a patched font

- [Source Code Pro](https://github.com/powerline/fonts/blob/master/SourceCodePro/Source%20Code%20Pro%20for%20Powerline.otf)
- [Source Code Pro + Font Awesome](https://github.com/Falkor/dotfiles/blob/master/fonts/SourceCodePro%2BPowerline%2BAwesome%2BRegular.ttf), this one is needed if you want the icons from Font Awesome as shown in the screenshot for Powerlevel10k.
- [Others @ powerline fonts](https://github.com/powerline/fonts)
    
Open the downloaded font and press "Install Font".

Set this font in iTerm2 (iTerm → Preferences → Profiles → Text → Change Font), best to do this for "Font" and for "Non-ASCII Font".

Restart iTerm2 for all changes to take effect.

# Further tweaking

Things like

- auto suggestions
- word jumping with arrow keys / natural text editing
- shorter prompt style
- syntax highlighting
- visual studio code config

can be found in the section below.

## Auto suggestions (for Oh My Zsh)

![Auto suggestions](http://i66.tinypic.com/b5i9dv.png)

Just follow these steps: https://github.com/zsh-users/zsh-autosuggestions/blob/master/INSTALL.md#oh-my-zsh

If the auto suggestions do not appear to show, it could be a problem with your color scheme. Under "iTerm → Preferences → Profiles → Colors tab", check the value of Black Bright, that is the color your auto suggestions will have. It will be displayed on top of the Background color. If there is not enough contrast between the two, you won't see the suggestions even if they're actually there..

## Enable word jumps and word deletion, aka natural text selection

By default, word jumps (option + → or ←) and word deletions (option + backspace) do not work. To enable these, go to "iTerm → Preferences → Profiles → Keys → Load Preset... → Natural Text Editing → Boom! Head explodes"

## Custom prompt styles

By default, your prompt will now show “user@hostname” in the prompt. This will make your prompt rather bloated. To remove this you can add the line `DEFAULT_USER=$(whoami)`to `~/.zshrc`.

For further customisation of your prompt, you can follow a great guide here: https://code.tutsplus.com/tutorials/how-to-customize-your-command-prompt--net-24083

## Syntax highlighting

```
brew install zsh-syntax-highlighting
```

If you do not have or do not like homebrew, follow [the installation instructions](https://github.com/zsh-users/zsh-syntax-highlighting/blob/master/INSTALL.md) instead.

After installation, add the following line

```
source /usr/local/share/zsh-syntax-highlighting/zsh-syntax-highlighting.zsh
```

to **the end** of your `.zshrc` file. After that, it's best to restart your terminal. Sourcing your `~/.zshrc` does not seem to work well with this plugin.

## Visual Studio Code config

Installing a patched font will mess up the integrated terminal in VS Code unless you use the proper settings. You'll need to go to settings (CMD + ,) and add or edit the following values:

- for Source Code Pro + Font Awesome: `"terminal.integrated.fontFamily": "'SourceCodePro+Powerline+Awesome Regular'"`. The single quotes are important! Restart VS Code after the config change.
- for Source Code Pro: `"terminal.integrated.fontFamily": "Source Code Pro for Powerline"`
- for Meslo: `"terminal.integrated.fontFamily": "Meslo LG M for Powerline"`
- for other fonts you'll need to check the font name in Font Book. You can right click on them on select "Show in Finder" to get the exact name.

You can also set the fontsize e.g.: `"terminal.integrated.fontSize": 14`