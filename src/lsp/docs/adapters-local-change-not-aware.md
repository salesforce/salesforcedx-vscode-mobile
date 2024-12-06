# adapters-local-change-not-aware

The wire adapters `getRelatedListRecords` and `getRelatedListCount` work with records while offline. However, those wire adapters won't update the related list to add or remove records that are created or deleted while offline.

As an alternative to using `getRelatedListRecords`, use GraphQL to create a related list that supports records that are created or deleted while offline.

Currently, there isn't a GraphQL equivalent to `getRelatedListCount` that works offline. 

See [Parent-to-Child Relationships](https://developer.salesforce.com/docs/platform/graphql/guide/filter-parent.html#parent-to-child-relationships) in the GraphQL API Developer Guide for more details.