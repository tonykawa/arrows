window.onload = function()
{
    var graphModel;
    if ( !localStorage.getItem( "graph-diagram-markup" ) )
    {
        graphModel = gd.model();
        graphModel.createNode().x( 0 ).y( 0 );
        save( formatMarkup() );
    }
    if ( localStorage.getItem( "graph-diagram-style" ) )
    {
        d3.select( "link.graph-style" )
            .attr( "href", localStorage.getItem( "graph-diagram-style" ) );
    }
    graphModel = parseMarkup( localStorage.getItem( "graph-diagram-markup" ) );

    var svg = d3.select("#canvas")
        .append("svg:svg")
        .attr("class", "graphdiagram");

    var diagram = gd.diagram()
        .scaling(gd.scaling.centerOrScaleDiagramToFitSvg)
        .overlay(function(layoutModel, view) {
            var nodeOverlays = view.selectAll("rect.node.overlay")
                .data(layoutModel.nodes);

            nodeOverlays.exit().remove();

            nodeOverlays.enter().append("rect")
                .attr("class", "node overlay")
                // .call( d3.drag().on( "drag", drag ).on( "end", dragEnd ) )
                .call( d3.behavior.drag().on( "drag", drag ).on( "dragend", dragEnd ) )
                .on( "dblclick", editNode );

            nodeOverlays
                .attr("width", function(node) {
                    return node.radius.outside() * 2;
                })
                .attr("height", function(node) {
                    return node.radius.outside() * 2;
                })
                .attr("stroke", "none")
                .attr("fill", "rgba(255, 255, 255, 0)")
                .attr("rx", function(node) {
                    if(node.model.isRectangle())
                        return "30";
                    else
                        return node.radius.outside();
                })
                .attr("ry", function(node) {
                    if(node.model.isRectangle())
                        return "30";
                    else
                        return node.radius.outside();
                })
                .attr("x", function(node) {
                    return node.x - node.radius.outside() + node.radius.borderWidth / 2;
                })
                .attr("y", function(node) {
                    return node.y - node.radius.outside() + node.radius.borderWidth / 2;
                });

            var nodeRings = view.selectAll("rect.node.ring")
                .data(layoutModel.nodes);

            nodeRings.exit().remove();

            nodeRings.enter().append("rect")
                .attr("class", "node ring")
                // .call( d3.drag().on( "drag", dragRing ).on( "end", dragEnd ) );
                .call( d3.behavior.drag().on( "drag", dragRing ).on( "dragend", dragEnd ) )

            nodeRings
                .attr("width", function(node) {
                    return node.radius.outside() * 2 + node.radius.borderWidth;
                })
                .attr("height", function(node) {
                    return node.radius.outside() * 2 + node.radius.borderWidth;
                })
                .attr("fill", "none")
                .attr("stroke", "rgba(255, 255, 255, 0)")
                .attr("stroke-width", "10px")
                .attr("rx", function(node) {
                    if(node.model.isRectangle())
                        return "35";
                    else
                        return node.radius.outside() + node.radius.borderWidth;
                })
                .attr("ry", function(node) {
                    if(node.model.isRectangle())
                        return "35";
                    else
                        return node.radius.outside() + node.radius.borderWidth;
                })
                .attr("x", function(node) {
                    return node.x - node.radius.outside();
                })
                .attr("y", function(node) {
                    return node.y - node.radius.outside();
                });

            var relationshipsOverlays = view.selectAll("path.relationship.overlay")
                .data(layoutModel.relationships);

            relationshipsOverlays.exit().remove();

            relationshipsOverlays.enter().append("path")
                .attr("class", "relationship overlay")
                .attr("fill", "rgba(255, 255, 255, 0)")
                .attr("stroke", "rgba(255, 255, 255, 0)")
                .attr("stroke-width", "5px")
                .on( "dblclick", editRelationship );

            relationshipsOverlays
                .attr("transform", function(r) {
                    var angle = r.start.model.angleTo(r.end.model);
                    return "translate(" + r.start.model.ex() + "," + r.start.model.ey() + ") rotate(" + angle + ")";
                } )
                .attr("d", function(d) { return d.arrow.outline; } );
        });

    function draw()
    {
        svg
            .data([graphModel])
            .call(diagram);
            // updateSvgDownloadLink();
    }

    function save( markup )
    {
        localStorage.setItem( "graph-diagram-markup", markup );
        localStorage.setItem( "graph-diagram-style", d3.select( "link.graph-style" ).attr( "href" ) );
    }

    var newNode = null;
    var newRelationship = null;

    function findClosestOverlappingNode( node )
    {
        var closestNode = null;
        var closestDistance = Number.MAX_VALUE;

        var allNodes = graphModel.nodeList();

        for ( var i = 0; i < allNodes.length; i++ )
        {
            var candidateNode = allNodes[i];
            if ( candidateNode !== node )
            {
                var candidateDistance = node.distanceTo( candidateNode ) * graphModel.internalScale();
                if ( candidateDistance < 50 && candidateDistance < closestDistance )
                {
                    closestNode = candidateNode;
                    closestDistance = candidateDistance;
                }
            }
        }
        return closestNode;
    }

    function drag()
    {
        var node = this.__data__.model;
        node.drag(d3.event.dx, d3.event.dy);
        diagram.scaling(gd.scaling.growButDoNotShrink);
        draw();
    }

    function dragRing()
    {
        var node = this.__data__.model;
        if ( !newNode )
        {
            newNode = graphModel.createNode().x( d3.event.x ).y( d3.event.y );
            newRelationship = graphModel.createRelationship( node, newNode );
        }
        var connectionNode = findClosestOverlappingNode( newNode );
        if ( connectionNode )
        {
            newRelationship.end = connectionNode
        } else
        {
            newRelationship.end = newNode;
        }
        node = newNode;
        node.drag(d3.event.dx, d3.event.dy);
        diagram.scaling(gd.scaling.growButDoNotShrink);
        draw();
    }

    function dragEnd()
    {
        if ( newNode )
        {
            newNode.dragEnd();
            if ( newRelationship && newRelationship.end !== newNode )
            {
                graphModel.deleteNode( newNode );
            }
        }
        newNode = null;
        save( formatMarkup() );
        diagram.scaling(gd.scaling.centerOrScaleDiagramToFitSvgSmooth);
        draw();
    }

    d3.select( "#add_node_button" ).on( "click", function ()
    {
        graphModel.createNode().x( 0 ).y( 0 );
        save( formatMarkup() );
        draw();
    } );

    function onControlEnter(saveChange)
    {
        return function()
        {
            if ( d3.event.ctrlKey && d3.event.keyCode === 13 )
            {
                saveChange();
            }
        }
    }

    function editNode()
    {
        // var editor = d3.select(".pop-up-editor.node");
        // appendModalBackdrop();
        var element = "#nodeModal";
        var editor = d3.select("#nodeModal");
        var button = d3.select("#nodeButton");
        button.node().click();
        // editor.classed( "hide", false );

        var node = this.__data__.model;

        var captionField = editor.select("#node_caption");
        captionField.node().value = node.caption() || "";
        captionField.node().select();


        var propertiesField = editor.select("#node_properties");
        propertiesField.node().value = node.properties().list().reduce(function(previous, property) {
            return previous + property.key + ": " + property.value + "\n";
        }, "");

        //current color values
        var backgroundColor = editor.select("#node_bg_color").node(); 
        var textColor = editor.select("#node_txt_color").node();
        backgroundColor.value = node.style("background-color");
        textColor.value = node.style("color");

        function saveChange()
        {
            //updating node's text and background color
            node.style("background-color", backgroundColor.value);
            node.style("color", textColor.value);

            //updating node's shape
            selectedShape = editor.select("#node-shape").node().value;
            if(selectedShape == "Circle") {
                node.isRectangle(false);
            }
            else {
                node.isRectangle(true);
            }

            node.caption( captionField.node().value );
            node.properties().clearAll();
            propertiesField.node().value.split("\n").forEach(function(line) {
                var tokens = line.split(/: */);
                if (tokens.length === 2) {
                    var key = tokens[0].trim();
                    var value = tokens[1].trim();
                    if (key.length > 0 && value.length > 0) {
                        node.properties().set(key, value);
                    }
                }
            });

            save( formatMarkup() );
            draw();
            cancelModal(element);
        }

        function deleteNode()
        {
            graphModel.deleteNode(node);
            save( formatMarkup() );
            draw();
            cancelModal(element);
        }

        function cancelNode()
        {
            cancelModal(element);
        }

        captionField.on("keypress", onControlEnter(saveChange) );
        propertiesField.on("keypress", onControlEnter(saveChange) );

        editor.select("#edit_node_save").on("click", saveChange);
        editor.select("#edit_node_delete").on("click", deleteNode);
        editor.select("#cancel_edit_node").on("click", cancelNode);
    }

    function editRelationship()
    {
        // var editor = d3.select(".pop-up-editor.relationship");
        var element = "#edgeModal";
        var editor = d3.select("#edgeModal");
        var button = d3.select("#edgeButton")
        button.node().click();
        // appendModalBackdrop();
        // editor.classed( "in", false );
        // editor.attr( "class", "modal fade in pop-up-editor relationship" )
        // console.log(editor)
        var relationship = this.__data__.model;
        var relationshipTypeField = editor.select("#relationship_type");
        relationshipTypeField.node().value = relationship.relationshipType() || "";
        relationshipTypeField.node().select();

        var propertiesField = editor.select("#relationship_properties");
        propertiesField.node().value = relationship.properties().list().reduce(function(previous, property) {
            return previous + property.key + ": " + property.value + "\n";
        }, "");

        function saveChange()
        {
            relationship.relationshipType( relationshipTypeField.node().value );
            relationship.properties().clearAll();
            propertiesField.node().value.split("\n").forEach(function(line) {
                var tokens = line.split(/: */);
                if (tokens.length === 2) {
                    var key = tokens[0].trim();
                    var value = tokens[1].trim();
                    if (key.length > 0 && value.length > 0) {
                        relationship.properties().set(key, value);
                    }
                }
            });
            save( formatMarkup() );
            draw();
            cancelModal(element);
        }

        function reverseRelationship()
        {
            relationship.reverse();
            save( formatMarkup() );
            draw();
            cancelModal(element);
        }

        function deleteRelationship()
        {
            graphModel.deleteRelationship(relationship);
            save( formatMarkup() );
            draw();
            cancelModal(element);
        }

        function cancelEditEdge() {
            cancelModal(element);
        }

        relationshipTypeField.on("keypress", onControlEnter(saveChange) );
        propertiesField.on("keypress", onControlEnter(saveChange) );

        editor.select("#edit_relationship_save").on("click", saveChange);
        editor.select("#edit_relationship_reverse").on("click", reverseRelationship);
        editor.select("#edit_relationship_delete").on("click", deleteRelationship);
        editor.select("#cancel_edit_relationship").on("click", cancelEditEdge);
        
        
    }

    function formatMarkup()
    {
    	//To-Do: Add colors and shape settings, also add rectangle shape to bootstrap styles
        var container = d3.select( "body" ).append( "div" );
        gd.markup.format( graphModel, container );
        var markup = container.node().innerHTML;
        markup = markup
            .replace( /<li/g, "\n  <li" )
            .replace( /<span/g, "\n    <span" )
            .replace( /<\/span><\/li/g, "</span>\n  </li" )
            .replace( /<\/ul/, "\n</ul" );
        container.remove();
        return markup;
    }

    function cancelModal(element)
    {
        $(element).modal('hide');
        // d3.selectAll( ".modal" ).classed( "hide", true );
        // d3.selectAll( ".modal-backdrop" ).remove();
    }

    d3.selectAll( ".btn.cancel" ).on( "click", cancelModal );
    d3.selectAll( ".modal" ).on( "keyup", function() { if ( d3.event.keyCode === 27 ) cancelModal(); } );

    function appendModalBackdrop()
    {
        // d3.select( "body" ).append( "div" )
        //     .attr( "class", "modal-backdrop" )
        //     .on( "click", cancelModal );
    }

    var exportMarkup = function ()
    {
        // appendModalBackdrop();
        // d3.select( ".modal.export-markup" ).classed( "hide", false );

        var markup = formatMarkup();
        d3.select( "textarea.code" )
            // .attr( "rows", markup.split( "\n" ).length * 2 )
            .node().value = markup;
    };

    function parseMarkup( markup )
    {
        var container = d3.select( "body" ).append( "div" );
        container.node().innerHTML = markup;
        var model = gd.markup.parse( container.select("ul.graph-diagram-markup") );
        container.remove();
        return model;
    }

    var useMarkupFromMarkupEditor = function ()
    {
        var markup = d3.select( "textarea.code" ).node().value;
        graphModel = parseMarkup( markup );
        save( markup );
        draw();
        cancelModal();
    };

    d3.select( "#save_markup" ).on( "click", useMarkupFromMarkupEditor );

    function updateSvgDownloadLink()
    {
    	var rawSvg = new XMLSerializer().serializeToString(d3.select("#canvas svg" ).node());
        var rawSvg = new XMLSerializer().serializeToString(d3.select("#canvas svg" ).node());
        d3.select("#downloadSvgButton").attr('href', "data:image/svg+xml;base64," + btoa( rawSvg ));
	}

    var openConsoleWithCypher = function (evt)
    {
        var cypher = d3.select(".export-cypher .modal-body textarea.code").node().value;
        cypher = cypher.replace(/\n  /g," ");
        var url="http://console.neo4j.org"+
            "?init=" + encodeURIComponent(cypher)+
            "&query=" + encodeURIComponent("start n=node(*) return n");
        d3.select( "#open_console" )
                    .attr( "href", url );
        return true;
    };

    d3.select( "#open_console" ).on( "click", openConsoleWithCypher );

    var exportCypher = function ()
    {
        appendModalBackdrop();
        d3.select( ".modal.export-cypher" ).classed( "hide", false );

        var statement = gd.cypher(graphModel);
        d3.select( ".export-cypher .modal-body textarea.code" )
            .attr( "rows", statement.split( "\n" ).length )
            .node().value = statement;
    };


    var chooseStyle = function()
    {
        appendModalBackdrop();
        d3.select( ".modal.choose-style" ).classed( "hide", false );
    };

    d3.select("#saveStyle" ).on("click", function() {
        var selectedStyle = d3.selectAll("input[name=styleChoice]" )[0]
            .filter(function(input) { return input.checked; })[0].value;
        d3.select("link.graph-style")
            .attr("href", "style/" + selectedStyle);

        graphModel = parseMarkup( localStorage.getItem( "graph-diagram-markup" ) );
        save(formatMarkup());
        draw();
        cancelModal();
    });

    function changeInternalScale() {
        graphModel.internalScale(d3.select("#internalScale").node().value);
        draw();
    }

    function importDiagram() {
    	//To-Do: read selected style from file
    	if (window.File && window.FileReader && window.FileList && window.Blob) {
	    	var fileSelected = document.createElement("input");
	        fileSelected.setAttribute("type", "file");
    	
		    fileSelected.addEventListener("change", function(e) {
		        //Get the file object 
		        var fileTobeRead = fileSelected.files[0];

	            var fileReader = new FileReader(); 
	            fileReader.onload = function (e) { 
	                graphModel = parseMarkup(fileReader.result);
	                draw(); 
	            } 
	            fileReader.readAsText(fileTobeRead);
		    }, false);
	        fileSelected.click();
		} 
	 	else { 
	    	alert("Files are not supported"); 
	 	}
    }

    function saveSession() {
    	//To-Do: save selected style to file
		var text = formatMarkup();
		var filename = $("#input-fileName").val()
		var blob = new Blob([text], {type: "text/plain;charset=utf-8"});
		saveAs(blob, filename+".graph");
	}

    d3.select("#internalScale").node().value = graphModel.internalScale();
    console.log(graphModel.internalScale());
    d3.select(window).on("resize", draw);
    d3.select("#internalScale" ).on("change", changeInternalScale);
    d3.select( "#saveSessionButton" ).on( "click", saveSession );
    d3.select( "#exportMarkupButton" ).on( "click", exportMarkup );
    d3.select( "#importDiagram" ).on( "click", importDiagram );
	// d3.select( "#exportCypherButton" ).on( "click", exportCypher );
    // d3.select( "#chooseStyleButton" ).on( "click", chooseStyle );
    d3.selectAll( ".modal-dialog" ).on( "click", function ()
    {
        d3.event.stopPropagation();
    } );

    draw(); 
    console.log("Finish Init")
    
};
