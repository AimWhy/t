import { Component } from 'react';
import { withRouter, } from 'react-router-dom';

// Return scroll to top on route change
class ScrollToTop extends Component {
  componentDidUpdate(prevProps) {
    const { history, location } = this.props;
    // do not influence scroll on browser back/forward
    if (history.action === 'POP') {
      return;
    }

    // no scroll when extending the current path
    const pathArr = location.pathname.split('/');
    if (!prevProps.location.pathname.includes(pathArr[1])) {
      window.scrollTo(0, 0);
    }
  }
  render() {
    return this.props.children;
  }
}
export const ScrollRestoration = withRouter(ScrollToTop);

/******************* Demo ********************/

export default class App extends Component {
  render() {
    return (
      <BrowserRouter>
        <Switch>
          <Route exact path="/cypress-tests" component={Tests} />
          <Route>
            <div>
              <Header>
                <Route
                  render={({ location }) => (
                    <PrimaryNav>
                      {sections.map((l) => {
                        const selected = location.pathname.includes(l.path);

                        return (
                          <PrimaryNavItem
                            key={l.path}
                            selected={selected}
                            to={l.path}
                          >
                            {l.label}
                          </PrimaryNavItem>
                        );
                      })}
                    </PrimaryNav>
                  )}
                />
              </Header>

              <ScrollRestoration>
                <AppContainer>
                  <Helmet>
                    <title>React Select</title>
                    <meta
                      name="description"
                      content="A flexible and beautiful Select Input control for ReactJS with multiselect, autocomplete, async and creatable support."
                    />
                  </Helmet>
                  <Route
                    render={(props) => (
                      <Fragment>
                        <PageNav {...props} />
                        <AppContent>
                          <PageContent>
                            <Section {...props} />
                          </PageContent>
                        </AppContent>
                      </Fragment>
                    )}
                  />
                </AppContainer>
              </ScrollRestoration>
              <Footer />
            </div>
          </Route>
        </Switch>
      </BrowserRouter>
    );
  }
}