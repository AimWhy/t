const Match = (function (Match) {
  Match[Match['Exact'] = 1] = 'Exact';
  Match[Match['Prefix'] = 2] = 'Prefix';
  Match[Match['PrefixPriority'] = 4] = 'PrefixPriority';
  Match[Match['Regex'] = 8] = 'Regex';
  Match[Match['RegexNoCase'] = 16] = 'RegexNoCase';
  Match[Match['NegativeRegex'] = 32] = 'NegativeRegex';
  Match[Match['NegativeRegexNoCase'] = 64] = 'NegativeRegexNoCase';
  return Match;
})({});

class Location {
  constructor(path, match, contents) {
    this.path = path;
    this.match = match;
    this.contents = contents;
  }
}

function getLocations(option) {
  let locations = [];

  for (let item of option) {
    let parts = item.split(' ');
    const modifier = parts[0];
    const path = parts[1];
    const contents = parts[2];

    const match = ({
      '=': Match.Exact,
      '~': Match.Regex,
      '~*': Match.RegexNoCase,
      '!~': Match.NegativeRegex,
      '!~*': Match.NegativeRegexNoCase,
      '^~': Match.PrefixPriority
    })[modifier] || Match.Prefix;
  
    locations.push(new Location(path, match, contents));
  }

  return locations;
}

function locationMatch(url, option = []) {
    debugger
  let locations = getLocations(option);
  let target = new URL(url);
  let results = [];

  // check for exact matches
  for (let loc of locations) {
    if (loc.match === Match.Exact && loc.path === target.pathname) {
      results.push(loc);
      return [loc, results];
    }
  }

  // check prefixes
  let best_match = null;
  let best_length = 0;
  for (let loc of locations) {
    if (loc.match & (Match.Prefix | Match.PrefixPriority)) {
      if (target.pathname.startsWith(loc.path)) {
        results.push(loc);
        if (loc.path.length > best_length) {
          best_match = loc;
          best_length = loc.path.length;
        }
      }
    }
  }

  // for priority prefix match, don't go on to regex matching
  if (best_match && best_match.match === Match.PrefixPriority) {
    return [best_match, results];
  }

  // regex match
  for (let loc of locations) {
    if (loc.match & (Match.Regex | Match.RegexNoCase | Match.NegativeRegex | Match.NegativeRegexNoCase)) {
      const options = (loc.match & (Match.RegexNoCase || Match.NegativeRegexNoCase)) ? 'i' : '';
      const isNegative = loc.match & (Match.NegativeRegex | Match.NegativeRegexNoCase);
      const re = new RegExp(loc.path, options);
      const isMatch = target.pathname.match(re);

      if (isNegative ? !isMatch : isMatch) {
        results.push(loc);
        return [loc, results];
      }
    }
  }

  // regex failed, use the stored longest match
  if (best_match) {
    return [best_match, results];
  }

  // no previous match
  return [null, results];
}

let why = locationMatch('http://domain2.com/abcd/', [
    '~ ^/(images|javascript|js|css|flash|media|static)/ data',
    '^~ /abc {^~/abc',
    ' /abcd {/abcd',
    '^~ /abcde {^~/abcde',
    ' /abcdef {/abcdef',
    '~ /abc {~/abc'
]);
console.log(why);
