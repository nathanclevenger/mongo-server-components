import React from 'react'
import { Document, Filter, MatchKeysAndValues, MongoClient, Sort, SortDirection, WithId } from 'mongodb'

const client = new MongoClient(process.env.MONGODB_URI!)


type ListProps<T = Document> = {
  id?: string
  style?: React.CSSProperties
  classNames?: string
  children?: React.ReactElement<WithId<Document>>
  db?: string
  coll: string
  filter?: Filter<T>
  sort?: Sort
  direction?: SortDirection
  skip?: number
  limit?: number
  item?: React.FC<WithId<Document>>
} & ({
  children: React.ReactElement<WithId<Document>>
} | {
  item: React.FC<WithId<Document>>
})


export const MongoList = async ({ db, coll, filter = {}, sort, direction, skip, limit, item, children, ...props }: ListProps) => {

  const cursor = client.db(db).collection(coll).find(filter)
  if (sort) cursor.sort(sort, direction)
  if (skip) cursor.skip(skip)
  if (limit) cursor.limit(limit)
  const data = await cursor.toArray()


  if (children) return (
    <div {...props}>
      {data.map((doc, i) => React.cloneElement(children, { key: i, ...doc }))}
    </div>
  )

  if (item) return (
    <div {...props}>
      {data.map((doc, i) => React.createElement(item, { key: i, ...doc }))}
    </div>
  )
}


type ItemProps<T = Document> = {
  id?: string
  style?: React.CSSProperties
  classNames?: string
  db?: string
  coll: string
  filter: Filter<T>
  children?: React.ReactElement<WithId<T>>
  item?: React.FC<WithId<T>>
  create?: boolean
  setOnInsert?: MatchKeysAndValues<T>
} & ({
  children: React.ReactElement<WithId<T>>
} | {
  item: React.FC<WithId<T>>
})


export const MongoItem = async ({ db, coll, filter, create, children, item }: ItemProps) => {

  const doc = create 
    ? await client.db(db).collection(coll).findOneAndUpdate(filter, { $setOnInsert: filter }, { upsert: true, returnDocument: 'after' }) 
    : await client.db(db).collection(coll).findOne(filter)  

  if (children && doc) return React.cloneElement(children, doc)
  if (item && doc) return React.createElement(item, doc)

}


export const MongoForm = async ({ children, ...props }: ItemProps) => {

  async function upsert(formData: FormData) {
    'use server'
    const data = Object.fromEntries(formData.entries())
    const doc = await client.db(props.db).collection(props.coll).findOneAndUpdate(props.filter, 
        { $setOnInsert: props.filter, $set: data }, 
        { upsert: true, returnDocument: 'after' })
  }

  return (
    // @ts-ignore TODO: Figure out typing issue see https://github.com/vercel/next.js/discussions/56581
    <form action={upsert}>
      {children}
    </form>
  )

}