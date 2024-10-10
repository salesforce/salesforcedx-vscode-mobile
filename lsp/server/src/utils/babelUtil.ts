/*
 * Copyright (c) 2024, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import * as parser from '@babel/parser';
import { Node } from '@babel/types';

/**
 * parse the input javascript source code and return the corresponding babel node. 
 * @param src the source javascript code
 * @returns babel node 
 */
export function parseJs(src: string): Node {
    return parser.parse(src, {
        sourceType: 'module',
        plugins: ['decorators']
    });
}