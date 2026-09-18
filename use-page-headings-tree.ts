
/**
 Adapted from https://github.com/kbrock84/use-page-headings-tree/blob/master/src/index.js
 and converted into Typescript
*/

import { useEffect } from "react"
export interface NodeTree {
    id: string
    title: string
    children: NodeTree[]
    level: number
}

type HeadingLevels = 'H2' | 'H3' | 'H4' | 'H5' | 'H6'

interface LatestRootList  {
    [key:string]: string
}

interface NodeObject {
    [key:string]: Node
}

type Roots = {
    [key in HeadingLevels]: NodeObject
}

interface Node {
    id: string
    text: string
    expanded: boolean
    childrenCount: 0
    rootId: string
    element: HTMLHeadingElement
    childNodes: Node[]
    index: number
    parentMap: string[]
}



const getParentMap = (headingLevel:string, latestRoots:LatestRootList) => {
    const r =  Object.keys(latestRoots)
		.map((k) => latestRoots[k])
		.slice(0, parseInt(headingLevel[1]) - 2)
    return r
}


const transformRootNode = (node:Node) => ({
        ...node,
        id: node.element.id,
        text: node.element.innerText || node.element.innerHTML,
    })

const checkParent = (parent:Node) => {
	if (!parent) {
		throw Error(
			"(usePageHeadingsTree.js): One of the tree nodes is missing a parent.\n" +
            "You may have skipped a heading level in your document or your query may " +
            'not contain a sequential list of heading nodes (Correct: "h2,h3,h4" Incorrect: "h2,h4")'
		);
	}
}

const checkTag = (tagName:string) => {
	if (!/^H[2-6]$/.test(tagName)) {
		throw Error(
			`(usePageHeadingsTree.js): <${tagName.toLowerCase()}> elements are not supported. ` +
            ` Only heading elements (<h2> through <h6>)  are supported (for now).`
		);
	}
}

const getFlatNodeListFromHeadings = (headings:NodeListOf<HTMLHeadingElement>) => {
	const latestRoots: LatestRootList = {}
	
    const roots: Roots = { 
        H2: {}, 
        H3: {}, 
        H4: {},
        H5: {}, 
        H6: {} 
    }

	const getDefaultRoot = (heading:HTMLHeadingElement, index:number): Node => ({
		id: '',
        text: '',
        expanded: false,
        childrenCount: 0,
		rootId: latestRoots[heading.tagName],
		element: heading,
		childNodes: [],
		index: index,
        parentMap: []
        
	})

	headings.forEach((h, i) => {
		const tagName = h.tagName as HeadingLevels
        checkTag(tagName);

		latestRoots[tagName] = crypto.randomUUID()
		
        if (h.tagName === "H2") {
			roots.H2[latestRoots.H2] = getDefaultRoot(h, i);
			return
		}

		roots[tagName][latestRoots[h.tagName]] = {
			...getDefaultRoot(h, i),
			parentMap: getParentMap(h.tagName, latestRoots),
		}
	})

	return roots;
}


const getNodeTreeFromFlatNodeList = (roots:Roots): Node[] => {
    const rootKeys = Object.keys(roots) as HeadingLevels[]

	for (let i:number = rootKeys.length - 1; i >= 0; i--) {

        const parents = roots[rootKeys[i - 1]]
		const currentRoot = roots[rootKeys[i]]
		
        if (currentRoot) {
			Object.keys(currentRoot).forEach((childKey) => {
				const child = transformRootNode(currentRoot[childKey])
				
                if (child.parentMap?.length > 0) {
					const parentId = child.parentMap[child.parentMap.length - 1]
					const parent = parents[parentId]

					checkParent(parent);

					parent.childrenCount += child.childNodes.length + 1
					parent.childNodes.push(child)
				}
			})
		}
	}
	
    const finalRoots = Object.keys(roots.H2).map((k) => transformRootNode(roots.H2[k]) )
	return finalRoots;
}



const formatNodeTree = (nodes:Node[]):NodeTree[] => {
    const tree:NodeTree[] = []
    
    nodes.forEach((n) => {
        const newNode:NodeTree = {
            id: n.id,
            title: n.text,
            level: parseInt(n.element.tagName.slice(1)),
            children: formatNodeTree(n.childNodes)
        }
        if (newNode.id) tree.push(newNode)
    })
    return tree

}


export const usePageHeadingsTree = (headings:NodeListOf<HTMLHeadingElement>|HTMLHeadingElement[], callback:(tree:NodeTree[])=>void) => {
    useEffect(() => {
        const tree = formatNodeTree(
            getNodeTreeFromFlatNodeList(
                getFlatNodeListFromHeadings(headings as NodeListOf<HTMLHeadingElement>)
            )
        )
        callback(tree)
	}, [headings]);
}