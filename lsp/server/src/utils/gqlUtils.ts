/*
 * Copyright (c) 2024, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { ASTNode, FieldNode, Kind } from 'graphql';

export function findEntityNode(
    propertyNodeancestors: ReadonlyArray<ASTNode>
): FieldNode {
    if (propertyNodeancestors.length < 2) {
        throw new Error('No entity node exists');
    }
    const parent = propertyNodeancestors[0];
    if (parent.kind !== Kind.FIELD || parent.name.value !== 'edges') {
        throw new Error('No edges node exists');
    }
    const grandParent = propertyNodeancestors[1];
    if (parent.kind !== Kind.FIELD) {
        throw new Error('No entity node exists');
    }
    return grandParent as FieldNode;
}
