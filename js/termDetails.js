const dev = false;
const importantRelations = ['subClassOf', 'partOf']; //important (normalized) names of term-relations to be styled in css
const baseUrl = dev ? 'http://dev-gfbio.bgbm.org/api/terminologies/' : 'http://terminologies.gfbio.org/api/terminologies/';

const hierarchyService = 'hierarchy';
const termService = 'term';

var terminology =
// 'NCBITAXON';
// 'PESI';
'CHEBI';
// 'KINGDOM';

var termuri =
    // dev ? 'http://purl.bioontology.org/ontology/NCBITAXON/45372' : 'http://purl.obolibrary.org/obo/NCBITaxon_2'
    // dev ? 'http://purl.bioontology.org/ontology/NCBITAXON/78263' : 'http://purl.obolibrary.org/obo/NCBITaxon_78263'

// 'http://www.eu-nomen.eu/portal/taxon.php?GUID=6A8E85BD-5E52-4AE2-9444-99128C87A672'
//     'http://www.eu-nomen.eu/portal/taxon.php?GUID=AC47AA36-4552-45F7-8A0C-F007BE99F9A0'
// 'http://purl.obolibrary.org/obo/CHEBI_33672'
'http://purl.obolibrary.org/obo/CHEBI_16526'
// 'http://purl.obolibrary.org/obo/CHEBI_27841'
//     'http://purl.obolibrary.org/obo/CHEBI_27594'
//     'http://terminologies.gfbio.org/terms/KINGDOM/Bacteria'
;

var termLabel = '';

function start(sourceTerminology, uri) {

    if (sourceTerminology != null) {
        terminology = sourceTerminology;
    }

    if (uri != null) {
        termuri = uri;
    }

    createTabView();

    VIS.start();
    main();
}

//important (ts) term properties
var tsSchemaMap = {};

//further (external) term properties
var externalMap = {};

//term relations
var relationsMap = {};

//term relation labels
var relationsLabelMap = {};

//normalized term property names
var normalizedNameMap = {};

//term relations colors
var relationColorsMap = {};

var VIS = {
    nodes: [],
    links: [],
    path: 0,
    node: 0,
    tempnodes: [],

    start: function () {

        //get the term data details incl. context from json-ld file
        $.get(baseUrl + terminology + '/' + termService, {uri: termuri, format: 'jsonld'}, function (data, status, xhr) {
            if(status != 'success'){
                alert(status + ' - error retrieving term details. terminology=' + terminology + " and uri=" + termuri);
                return;
            }

            var result = data.results[0];
            var context = result["@context"];
            var graph = result["@graph"][0];

            //TEST
            if(dev){
                if(context && graph){
                    context['partOf'] = 'http://my.property/partOf';
                    graph['partOf'] = ['http://my.ontology/partOfParent1', 'http://my.ontology/partOfParent2', 'http://my.ontology/partOfParent3'];

                    context['has_a'] = 'http://my.property/has_a';
                    graph['has_a'] = ['http://my.ontology/hasClass1', 'http://my.ontology/hasClass2', 'http://my.ontology/hasClass3'];

                    context['myProp1'] = 'http://my.property/my_property1';
                    graph['myProp1'] = 'my property val 1';

                    context['my_prop2'] = 'http://my.property/my_property2';
                    graph['my_prop2'] = ['my property val 2.1', 'my property val 2.2'];
                }
            }

            Object.getOwnPropertyNames(context).forEach(function (value, idx, array) {
                var normalizedVal = value.replace(/\s+/g, '');
                normalizedNameMap[normalizedVal] = value;

                var str = graph[value];
                if (Array.isArray(graph[value])) {
                    str = graph[value][0];
                }

                if (value.startsWith('uri') || value.startsWith('preferred label')) {
                    tsSchemaMap[normalizedVal] = graph[value];
                } else if(context[value].includes('ts-schema')){
                    tsSchemaMap[normalizedVal] = graph[value];
                }else if(dev && (value.startsWith('label') || value.startsWith('definition') || value.startsWith('synonym'))){ //dev!
                    tsSchemaMap[normalizedVal] = graph[value];
                } else if (value.startsWith('type')){ //skip this term detail
                } else if (str.startsWith('http:')) {

                    /**
                     * rename relation uris with relation labels
                     *
                     */

                    var ar = [];
                    // if(graph[value] && Array.isArray(graph[value])){
                        for(var i in graph[value]){
                            $.get(baseUrl + terminology + '/' + termService, {uri: graph[value][i]}, function (data, status, xhr) {
                                if(status != 'success'){
                                    alert(status + ' - error retrieving labels.');
                                    return;
                                }

                                var results = data.results;
                                for(var j in results){
                                    relationsLabelMap[results[j].uri] = results[j].label;
                                }
                            });

                            if(i == graph[value].length -1){

                                // console.log(relationsLabelMap);

                                Object.getOwnPropertyNames(relationsLabelMap).forEach(function (val, idx, array) {
                                   console.log(val);

                                    for(var a in val){
                                       console.log(a);
                                   }

                                });

                                // var li = document.getElementById(graph[value][i]);
                                // li.textContent = results[j].label;
                            }
                        }
                    // }

                    /**
                     *
                     *
                     */

                    relationsMap[normalizedVal] = graph[value];
                } else {
                    externalMap[normalizedVal] = graph[value];
                }
            });


            //special case, for labels including an array of translations in the format "[translation]@[language]"
            var labelTranslations = [];
            if(tsSchemaMap['label'] && Array.isArray(tsSchemaMap['label'])){
                Object.getOwnPropertyNames(tsSchemaMap['label']).forEach(function (trans, idx, array) {
                    var x = tsSchemaMap['label'][idx];
                    if(idx > 0 && !isUndefined(x)){
                        var translation = x.split('@');
                        labelTranslations.push(translation[0] + " (" + translation[1] + ")");
                    }
                });

                tsSchemaMap['translations'] = labelTranslations;
                tsSchemaMap['label'] = tsSchemaMap['label'][0];
            }

            for (var termDetail in tsSchemaMap) {
                switch (termDetail) {
                    case 'preferredlabel': //dev
                    case 'label':
                        appendElement('termLabel', 'SPAN', tsSchemaMap[termDetail], 'termLabel');
                        break;
                    case 'uri':
                        var elem = document.getElementById('termUri');
                        elem.setAttribute('href', tsSchemaMap[termDetail]);
                        elem.innerHTML = tsSchemaMap[termDetail];
                        break;
                    case 'sourceTerminology':
                        appendElement('sourceTerminology', 'SPAN', tsSchemaMap[termDetail], 'sourceTerminology');
                        break;
                    case 'definition': //dev
                    case 'description':
                        appendTermDetail('description', termDetail, tsSchemaMap[termDetail]);
                        break;
                    case 'synonym': //dev
                    case 'synonyms':
                        appendTermDetail('synonyms', termDetail, tsSchemaMap[termDetail]);
                        break;
                    case 'commonNames':
                        appendTermDetail('commonNames', termDetail, tsSchemaMap[termDetail]);
                        break;
                    case 'Translation':
                        appendTermDetail('translations', termDetail, tsSchemaMap[termDetail]);
                        break;
                    default:
                        appendTermDetail('termDetails', termDetail, tsSchemaMap[termDetail]);
                }
            }

            for (var furtherTermDetail in externalMap) {
                appendFurtherTermDetail(furtherTermDetail, externalMap[furtherTermDetail]);
            }

            if (Object.keys(externalMap).length > 0) {
                document.getElementById('toggleDetails').classList.remove('initiallyHidden');
            }else{
                document.getElementById('toggleDetails').classList.add('initiallyHidden');
            }

            for (var termRelation in relationsMap) {
                var color = null;

                var div = document.createElement('DIV');
                var label = document.createElement('LABEL');
                var input = document.createElement('INPUT');
                var span = document.createElement('SPAN');


                // span.innerHTML = splitAndCapitalize(normalizedNameMap[termRelation]);
                span.innerHTML = normalizedNameMap[termRelation];
                input.type = 'checkbox';
                input.name = 'relation';
                input.checked = 'true';
                input.value = termRelation;

                label.appendChild(input);
                label.appendChild(span);
                div.appendChild(label);

                document.getElementById('relation-list-field').appendChild(div);

                if(importantRelations.indexOf(termRelation) != -1){
                    //important relation - styled in CSS
                    span.className = termRelation;
                }else{
                    color = getRandomHexColor();
                    span.style = 'stroke: ' + color + '; color: ' + color + ';';
                }

                appendTermRelation(normalizedNameMap[termRelation], relationsMap[termRelation], color);
            }

            if (Object.keys(relationsMap).length > 0) {
                document.getElementById('toggleRelations').classList.remove('initiallyHidden');
                document.getElementById('open-button').classList.remove('initiallyHidden');
            }else{
                document.getElementById('toggleRelations').classList.add('initiallyHidden');
                document.getElementById('open-button').classList.add('initiallyHidden');
            }

            var isOntology = false; //is not a taxonomy!
            //get the hierarchy
            $.getJSON(baseUrl + terminology +'/'+ hierarchyService, {uri: termuri}, function (data) {

                /*
                 *
                 *  Get the data for creating the views
                 *
                 */

                $.each(data.results, function () {
                    var sourceNode = this.uri;
                    var node = {
                        uri: this.uri,
                        label: this.label
                    };
                    VIS.tempnodes.push(node);

                    if(this.hierarchy.length > 1){
                        isOntology = isOntology || true;
                    }else{
                        isOntology = isOntology || false;
                    }

                    $.each(this.hierarchy, function () {
                        VIS.links.push({
                            source: sourceNode,
                            target: this,
                            weight: Math.random()
                        })
                    });
                });

                if(VIS.links.length > 0){
                    var viz = document.getElementById('rightScreen');
                    viz.classList.remove('initiallyHidden');
                    viz.classList.add('showInline');

                    // VIS.createTreeView(data);
                    VIS.createNetworkView(data);
                }

                if(dev){
                    document.getElementById('isOntology').innerHTML = 'isOntology=' + isOntology;
                }
            });

            addListener();
        });
    },

    /*
     *
     *   TREE VIEW
     *
     */
    createTreeView_test: function (data) {
        // test0.1 - just the list of concepts, ordered without hierarchy
        for (x in VIS.tempnodes) {
            var text = VIS.tempnodes[x].uri + " - " + VIS.tempnodes[x].label;
            var tn = document.createTextNode(text);
            var d = document.createElement('DIV');
            d.appendChild(tn);
            d.class = 'tabContent';
            document.getElementById('treeView').appendChild(d);
        }
    },

    createTreeView: function (data) {
        var treeNodes = {};
        var tree = d3.hierarchy(data.results, function (d) {
            $.each(d, function () {
                treeNodes[this.uri] = {
                    uri: this.uri,
                    label: this.label,
                    parents: this.hierarchy
                };
                // console.log(treeNodes[this.uri]);
            })
        });

        var root;
        var pathNodes = {};
        for(x in treeNodes){
            pathNodes[x] = treeNodes[x];
        }

        for(var x in pathNodes){
            // console.log(x);
            if((pathNodes[x].parents).length > 0){
                for(var i=0; i<(pathNodes[x].parents).length; i++){
                    (pathNodes[x].parents)[i] = pathNodes[(pathNodes[x].parents)[i]];
                }
            }else{ //root
                root = pathNodes[x];
            }
        }

        //test0.2.1 - delivers path until root - parents are doubled
        var d = document.createElement('DIV');
        d.className = 'childListElement';
        d.appendChild(document.createTextNode(pathNodes[termuri].label));
        document.getElementById('treeView').appendChild(d);

        var d_ = document.createElement('DIV');
        d_.appendChild(document.createTextNode("---"));
        document.getElementById('treeView').appendChild(d_);


        c(pathNodes[termuri].parents);

        function c(n) {
            if (Array.isArray(n) && n.length > 0) {

                var styleclass = 'parentListElement';
                if(n.length > 1){
                    styleclass = 'childListElement';
                }

                for (var i = 0; i < n.length; i++) {
                    var dd = document.createElement('DIV');
                    dd.className = styleclass;

                    var tn = document.createTextNode(n[i].label);
                    dd.appendChild(tn);
                    document.getElementById('treeView').appendChild(dd);

                    c(n[i].parents);
                }
            }
        }


        //test0.2 -> delivers only 'one' path until the root
        // // console.log('root:');
        // // console.log(root);
        // console.log(pathNodes[termuri]);
        //
        // var childs = {};
        // getChildren(root);
        //
        // function getChildren(root){
        //     for(x in treeNodes){
        //         console.log('len='+(treeNodes[x].parents).length);
        //
        //         for(var i=0; i< (treeNodes[x].parents).length; i++){
        //             var par = (treeNodes[x].parents)[i];
        //             var rootUri = root['uri'];
        //
        //             // if(childs[rootUri] && childs[rootUri].child.uri == treeNodes[x].uri) break;
        //             if(childs[rootUri] && childs[rootUri].i == i) break;
        //
        //             console.log(childs);
        //
        //             if(par.includes(rootUri)){
        //                childs[rootUri] =  {i: i, parlabel: root.label, child: {uri: treeNodes[x].uri, label: treeNodes[x].label}};
        //             }else{
        //                 getChildren(treeNodes[par]);
        //             }
        //         }
        //     }
        // }
        // console.log('childs:');
        // console.log(childs);
        //
        // // var t = d3.tree(tree);
        // //
        // // var svgtree = d3.select('#treeView').append('svgtree')
        // //     .attr("width", 500)
        // //     .append("g");
        // //
        // // $.each(treeNodes, function(x){
        // //    console.log(treeNodes[x]);
        // //
        // // });
    },



    /*
     *
     *   NETWORK VIEW
     *
     */
    createNetworkView: function (data) {
        // Compute the distinct nodes from the links.
        VIS.links.forEach(function (link) {
            link.source = VIS.nodes[link.source] ||
                (VIS.nodes[link.source] = {name: link.source});

            link.target = VIS.nodes[link.target] ||
                (VIS.nodes[link.target] = {name: link.target});

            link.value = link.weight;
        });


//		VIS.nodes.forEach(function(node) {
        VIS.tempnodes.forEach(function (tempnode) {
            if(!isUndefined(VIS.nodes[tempnode.uri])){ //TODO: why is uri undefined?
                if (VIS.nodes[tempnode.uri].name == tempnode.uri) {
                    VIS.nodes[tempnode.uri].label = tempnode.label;
                }
            }
        });
//		});

        //TODO
        var width = window.innerWidth / 2;
        var height = window.innerHeight; //- document.getElementById('header').clientHeight;

        var bodyRect = document.body.getBoundingClientRect(),
            elemRect = document.getElementById('treeView').getBoundingClientRect(),
            offset   = elemRect.top - bodyRect.top; //vertical offset to body

        var svg = d3.select('#networkView').append('svg')
            .attr('width', width)
            .attr('height', height);

        var force = d3.forceSimulation(d3.values(VIS.nodes))
                .force('link', d3.forceLink(VIS.links).distance(30))
                .force('charge', d3.forceManyBody().strength(-500))
                .force('center', d3.forceCenter(width / 2, height / 2))
                .force('collide', d3.forceCollide().radius(10).strength(5))
                .force('x', d3.forceX().x(window.innerWidth))
                .force('y', d3.forceY().y(offset))
                .on('tick', tick)
            ;

        // document.getElementById('networkView').addEventListener('click', function(event){
        //     force.restart();
        //     svg.attr('width', event.y);
        // });



        // console.log('force');
        // console.log(force.nodes());
        // console.log(force.force('link').links());

        // build the arrow
        svg.append('svg:defs').selectAll('marker')
            .data(['end'])
            .enter().append('svg:marker')
            .attr('id', String)
            .attr('viewBox', '0 -5 10 10')
            .attr('refX', 15)
            .attr('refY', -1.5)
            .attr('markerWidth', 6)
            .attr('markerHeight', 6)
            .attr('orient', 'auto')
            .append('svg:path')
            .attr('d', 'M0,-5L10,0L0,5');

        // add the links and the arrows
        //noinspection JSAnnotator
        path = svg.append('svg:g').selectAll('path')
            .data(force.force('link').links())
            .enter().append('svg:path')

            //TODO: call a colorMap to style paths
            .attr('class', function (data) {
                var className = 'link';
                var lbl = data['source']['label'];
                if (lbl.includes(termLabel)) {
                    className = ' subClassOf';
                }
                return className;
            })
            // .attr('style', 'stroke: #2277aa;')
            .attr('marker-end', 'url(#end)');


        //TODO

        // define the nodes
        node = svg.selectAll('.node')
            .data(force.nodes())
            .enter().append('g')
            .attr('class', 'node')
            // .call(force.drag()) //doesn't work anymore
        ;

        // add the nodes
        // node.append('rect')
        //     .attr('x', -50)
        //     .attr('y', -5)
        //     .attr('width', 100)
        //     .attr('height', 10);

        node.append('circle').attr('r', 5);


        var div = d3.select('networkView').append('div').attr('class', 'tooltip').style('opacity', 0);

        svg.selectAll('circle').on('mouseover', function (d) {
            div.transition().duration(200).style('opacity', .9);
            if (d.uri) {
                div.html(d.uri)
                    .style('left', (d3.event.pageX) + 'px')
                    .style('top', (d3.event.pageY - 28) + 'px');
            }
        })
            .on('mouseout', function (d) {
                div.transition()
                    .duration(500)
                    .style('opacity', 0);
            });

        // add the text
        node.append('text')
            .attr('x', 12) //12
            .attr('dy', '.35em')
            .text(function (d) {
                // console.log(d);
                return d.label;
            });


        // add the lines
        function tick() {
            // nodes[0].x = w / 2;
            // nodes[0].y = h / 2;

            path.attr('d', function (d) {
                var dx = d.target.x - d.source.x,
                    dy = d.target.y - d.source.y,
                    // dr = Math.sqrt(dx * dx + dy * dy);
                    dr = 0;
                return 'M' +
                    d.source.x + ',' +
                    d.source.y + 'A' +
                    dr + ',' + dr + ' 0 0,1 ' +
                    d.target.x + ',' +
                    d.target.y;
            });

            node
                .attr('transform', function (d) {
                    return "translate(" + d.x + ',' + d.y + ')';
                });
        }
    }
};



/**
 *
 * helper functions
 *
 */





function getRandomHexColor() {

    var strokes = [];
    for (var termRelation in relationsMap) {
        var element = document.getElementById(termRelation);

        if(element != null){
            var style = window.getComputedStyle(element);
            var stroke = style.getPropertyValue('stroke');
            if (!isUndefined(stroke) && stroke != null && !stroke.includes('none')) {
                strokes.push(stroke);
            }else{
                console.log('stroke is undefined: "' + stroke + '" -> for element: ');
                console.log(element);
            }
        }
    }

    var randColor = '#' + (Math.random() * 0xFFFFFF << 0).toString(16);
    if(strokes.length < 1){
        return randColor;
    }

    var c1;
    var c2 = randColor.replace('#', '0x');
    var isDifferent = true;
    for (var col in strokes) {

        c1 = rgbToHexCol(strokes[col]).replace('#', '0x');

        if(Math.abs(c1 - c2) > 0x09FFFF){
            isDifferent = isDifferent && true;
        }else{
            isDifferent = isDifferent && false;
        }
    }

    if(isDifferent){
        return randColor;
    }else{
        getRandomHexColor();
    }

}

function componentToHex(c) {
    c = parseInt(c);
    var hex = c.toString(16);
    return hex.length == 1 ? "0" + hex : hex;
}

function rgbToHex(r, g, b) {
    var x = "#" + componentToHex(r) + componentToHex(g) + componentToHex(b);
    console.log(x);
    return x;
}

function isUndefined(value) {
    return typeof value === 'undefined';
}

function rgbToHexCol(rgb){
    if(rgb!=null || !Number.isNaN(rgb)){
        console.log(rgb);
        rgb =
            !isUndefined(rgb) &&
            Array.isArray(rgb.split('rgb(')) ? rgb.split('rgb(')[1] : false;
        rgb =
            rgb && !isUndefined(rgb) &&
            Array.isArray(rgb.split(')')) ? rgb.split(')')[0] : false;
        rgb =
            rgb && !isUndefined(rgb) &&
            Array.isArray(rgb.split(", ")) ? rgb.split(", ") : false;

        if(rgb){
            return rgbToHex(rgb[0], rgb[1], rgb[2] );
        }
    }

    return rgbToHex(0,0,0);
}




//TODO

function addListener(){
    $('#toggleDetails').click(function () {

        $('#detailsToggleArea').slideToggle();

        if ($(this).attr('value') == 'show') {
            $(this).attr('value', 'hide');
            $('#toggleDetailsArrow').attr('src', 'files/arrow_down.png');
        } else {
            $(this).attr('value', 'show');
            $('#toggleDetailsArrow').attr('src', 'files/arrow_right.png');
        }
    });

    $('#toggleRelations').click(function () {

        $('#relationsToggleArea').slideToggle();

        if ($(this).attr('value') == 'show') {
            $(this).attr('value', 'hide');
            $('#toggleRelationsArrow').attr('src', 'files/arrow_down.png');
        } else {
            $(this).attr('value', 'show');
            $('#toggleRelationsArrow').attr('src', 'files/arrow_right.png');
        }
    });
}

function appendTermDetail(id, parent, children) {
    var newId = id + "_" + parent;

    var node = document.createElement('DIV');
    node.className = 'termDetailWrapper';
    node.id = newId;
    document.getElementById(id).appendChild(node);

    appendElement(newId, 'DIV', splitAndCapitalize(parent), 'parentListElement');
    appendElement(newId, 'SPAN', children, 'childListElement');
}

function appendFurtherTermDetail(parent, children) {
    appendListElement('furtherTermDetails', parent, children);
}

function appendTermRelation(parent, children, color) {
    appendListElement('termRelations', parent, children, color);
}

function appendListElement(id, parent, children) {
    appendListElement(id, parent, children, null);
}

function appendListElement(id, parent, children, color) {
    var childStyle = 'childListElement';
    if (importantRelations.indexOf(parent) != -1) {
        childStyle += " " + parent;
    }
    // appendElement(id, 'LI', parent, 'parentListElement');
    appendElement(id, 'LI', splitAndCapitalize(parent), 'parentListElement');
    appendElement(id, 'LI', children, childStyle, color);
}

function appendElement(id, elemType, content, styleClass) {
    appendElement(id, elemType, content, styleClass, null);
}

function appendElement(id, elemType, content, styleClass, color) {
    if (!Array.isArray(content)) {
        var cAr = [];
        cAr.push(content);
        content = cAr;
    }

    for (var i = 0; i < content.length; i++) {
        var text = content[i];

        if (elemType.startsWith('SPAN') && i < content.length - 1) {
            text += ", ";
        }

        var node = document.createElement(elemType);
        var textNode = document.createTextNode(text);
        node.appendChild(textNode);
        node.className = styleClass;
        if(text.startsWith('http')){
            node.id = text;
        }

        if(color != null){
            node.style = 'stroke: ' + color + '; color: ' + color + ';';
        }

        document.getElementById(id).appendChild(node);
    }
}

function splitAndCapitalize(word) {
    var wordArr;
    if (word.includes('_')) {
        wordArr = word.split('_');
    } else if(word.includes(' ')){
        wordArr = word.split(' ');
    } else {
        wordArr = word.split(/(?=[A-Z][a-z])/);
    }

    var result = '';
    for (var j = 0; j < wordArr.length; j++) {
        result += capitalizeFirstLetter(wordArr[j]);

        if (j < wordArr.length - 1) {
            result += " ";
        }
    }

    if(isUndefined(result)){
        return word;
    }

    return result;
}

function capitalizeFirstLetter(string){
    if(typeof string == 'string'){
        return string.charAt(0).toUpperCase() + string.slice(1);
    }
    return string;
}




/**
 *
 * Create the tabbed view
 *
 */

var tabLinks = []; //new Array();
var contentDivs = []; //new Array();

function createTabView() {
    // Grab the tab links and content divs from the page
    var tabListItems = document.getElementById('tabs').childNodes;
    for (var i = 0; i < tabListItems.length; i++) {
        if (tabListItems[i].nodeName == "LI") {
            var tabLink = getFirstChildWithTagName(tabListItems[i], 'A');
            var id = getHash(tabLink.getAttribute('href'));
            tabLinks[id] = tabLink;
            contentDivs[id] = document.getElementById(id);
        }
    }

    // Assign onclick events to the tab links, and
    // highlight the first tab
    var k = 0;
    for (var id in tabLinks) {
        tabLinks[id].onclick = showTab;
        tabLinks[id].onfocus = function () {
            this.blur()
        };
        if (k == 0) {
            tabLinks[id].className = 'selected';
        }
        k++;
    }

    // Hide all content divs except the first
    var j = 0;
    for (var id in contentDivs) {
        if (j != 0) {
            contentDivs[id].className = 'tabContent hide';
        }
        j++;
    }
}

function showTab() {
    var selectedId = getHash(this.getAttribute('href'));

    // Highlight the selected tab, and dim all others.
    // Also show the selected content div, and hide all others.
    for (var id in contentDivs) {
        if (id == selectedId) {
            tabLinks[id].className = 'selected';
            contentDivs[id].className = 'tabContent';
        } else {
            tabLinks[id].className = '';
            contentDivs[id].className = 'tabContent hide';
        }
    }

    // Stop the browser following the link
    return false;
}

function getFirstChildWithTagName(element, tagName) {
    for (var i = 0; i < element.childNodes.length; i++) {
        if (element.childNodes[i].nodeName == tagName) {
            return element.childNodes[i];
        }
    }
}

function getHash(url) {
    var hashPos = url.lastIndexOf('#');
    return url.substring(hashPos + 1);
}