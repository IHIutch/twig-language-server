import {
  SemanticTokensParams,
  SemanticTokens,
  SemanticTokensBuilder,
} from 'vscode-languageserver';
import { Server } from '../server';
import { PreOrderCursorIterator } from '../utils/pre-order-cursor-iterator';
import { pointToPosition } from '../utils/point-to-position';
import { semanticTokensLegend } from './tokens-provider';

const tokenTypes = new Map<string, number>(
  semanticTokensLegend.tokenTypes.map((v, i) => [v, i])
);

export class SemanticTokensProvider {
  server: Server;

  constructor(server: Server) {
    this.server = server;

    this.server.connection.languages.semanticTokens.on(
      this.serverRequestHandler.bind(this)
    );
  }

  async serverRequestHandler(params: SemanticTokensParams) {
    const semanticTokens: SemanticTokens = { data: [] };
    const uri = params.textDocument.uri;
    const document = this.server.documentCache.getDocument(uri);

    if (!document) {
      return semanticTokens;
    }

    const cst = await document.cst();
    const tokensBuilder = new SemanticTokensBuilder();
    const nodes = new PreOrderCursorIterator(cst.walk());

    for (const node of nodes) {
      const tokenType = tokenTypes.get(node.nodeType);

      if (!tokenType) {
        continue;
      }

      const start = pointToPosition(node.startPosition);

      tokensBuilder.push(
        start.line,
        start.character,
        node.nodeText.length,
        tokenType,
        0
      );
    }

    return tokensBuilder.build();
  }
}
