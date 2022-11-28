import ReactDOMServer from 'react-dom/server'
import { StaticRouter, StaticRouterProps } from 'react-router-dom/server'

import { App } from './App';

export const render = (url: string, context: StaticRouterProps) => {
  return ReactDOMServer.renderToString(
    <StaticRouter location={url} context={context}>
      <App />
    </StaticRouter>
  );
};
