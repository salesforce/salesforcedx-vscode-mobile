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
    const parentFieldAncestorIndex = findCloseAncestorWithType(
        propertyNodeancestors,
        Kind.FIELD
    );
    if (
        parentFieldAncestorIndex === -1 ||
        (propertyNodeancestors[parentFieldAncestorIndex] as FieldNode).name
            .value !== 'edges'
    ) {
        throw new Error('No edges node exists');
    }

    const grandParentFieldAncestorIndex = findCloseAncestorWithType(
        propertyNodeancestors,
        Kind.FIELD,
        parentFieldAncestorIndex + 1
    );

    if (grandParentFieldAncestorIndex === -1) {
        throw new Error('No entity node exists');
    }

    return propertyNodeancestors[grandParentFieldAncestorIndex] as FieldNode;
}

function findCloseAncestorWithType(
    ancesters: ReadonlyArray<ASTNode>,
    type: Kind,
    startIndex?: number
): number {
    for (let i = 0; i < ancesters.length; i++) {
        if (ancesters[i].kind === type) {
            return i;
        }
    }
    return -1;
}
