$(document).ready(function() {
  'use strict'
  var dataset = data;

  var scale = function(data, indicator) {
      var x = d3.scaleLinear()
        .domain([0, d3.max(data.features, function(d){ return d.properties[indicator]; })])

      var bins = d3.histogram()
        .domain(x.domain())
        .thresholds(x.ticks(14))
        (_.pluck(data, indicator));

      var y = d3.scaleLinear()
        .domain([0, d3.max(bins, function(d) {
          return d.length;
        })])

      var colorCode = d3.scaleThreshold()
        .domain(_.pluck(bins, "x1"))
        .range(["#FF2323","#FF4B3E","#972D07","#FFB30F","#849324", "#00A9A5","#1CCAD8","#15E6CD","#A1E887","#0CF574","#F84AA7","#A74482", "#8C248A", "#693668", "#1B1B3A"]);

      return colorCode;
  };

  var map = L.map('map').setView([40.7233127,-73.909681], 11);

      L.tileLayer('https://cartodb-basemaps-{s}.global.ssl.fastly.net/dark_all/{z}/{x}/{y}.png', {
        maxZoom: 16,
        minZoom: 10,
        attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>, &copy;<a href="https://carto.com/attribution">CARTO</a>'
      }).addTo(map);

//***************************
// Add hoods
//***************************
    var hoodsLayer = L.vectorGrid.slicer( hoods, {
      rendererFactory: L.canvas.tile,
      interactive: false,
      maxZoom: 16,
      minZoom: 10,
      vectorTileLayerStyles: {
        sliced: function(properties, zoom) {
          return {
            fillColor: false,
            fillOpacity: false,
            stroke: true,
            fill: false,
            color: '#ddd',
            opacity: 0.6,
            weight: 1,
          }
        }
      }
    })
    .setZIndex(100)
    .on("mouseover", function(e){
      console.log(e.layer.properties)
    });

    hoodsLayer.addTo(map);

//***************************
// Add data layers
//***************************
    var cc = scale(dataset, "mhi");

    var vectorGrid = L.vectorGrid.slicer( dataset, {
      rendererFactory: L.canvas.tile,
      interactive: true,
      maxZoom: 16,
      minZoom: 10,
      getFeatureId: function(f) {
        return f.properties.geo_id;
      },
      vectorTileLayerStyles: {
        sliced: function(properties, zoom) {

          return {
            fillColor: properties.mhi ? cc(properties.mhi) : "#222",
            fillOpacity: properties.mhi ? 0.85 : 0.7,
            stroke: properties.mhi ? true : false,
            fill: properties.pop_t ? true : false,
            color: '#666',
            opacity: 0.2,
            weight: 1,
          }
        }
      }

    })
    .on("mousemove", function(e){

        //a bit of a hack but works great
        if(e.layer.options.color != "steelblue") {
          var name = e.layer.properties.name,
              mhi = "Income: $" + e.layer.properties.mhi,
              mhi = mhi.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ","),
              femaleNum = !isNaN(e.layer.properties.pop_f) ? e.layer.properties.pop_f : "",
              maleNum = !isNaN(e.layer.properties.pop_m) ? e.layer.properties.pop_m : "",
              female = !isNaN(e.layer.properties.pop_s_f) ? "<br>female: " + e.layer.properties.pop_s_f + "%" + " (" + femaleNum + ")" : "",
              male = !isNaN(e.layer.properties.pop_s_m) ? "<br>male: " + e.layer.properties.pop_s_m + "%" + " (" + maleNum + ")" : "";


          $("#tooltip")
            .show()
            .css({
              top: e.originalEvent.clientY - 40,
              left: e.originalEvent.clientX + 20,
              zIndex: 100000
            })
            .html("<h2>" + name + "</h2><span>" + mhi + female + male + "</span>");

        }

    })
    .on("mouseout", function(){
      $("#tooltip").hide();
    })
    .on("click", function(e){
      e.originalEvent.preventDefault();
      console.log(e.layer)
    })
    .setZIndex(15)
    .on("load", function() {
      $("#wrapper").css("visibility", "visible");
      $("#spinner").hide();
    });

//***************************
// Add data legend
//***************************
  var createLegend = function(scale) {
    var legend = L.control({position: 'bottomright'});

      legend.onAdd = function (map, indicator) {
          var moneyFormater =  d3.format(".2s");
          var div = L.DomUtil.create('div', 'info legend');
          var html = "";

          var domain = [0].concat(scale.domain());
          var labels = _.map(domain, function(d) {
                return "$" + moneyFormater(d).replace('K', ' thousands');
            });


          html = '<ul><li data-low="'+domain[0]+'" data-high="'+domain[domain.length-1]+'" class="all">All</li>';

          for (var i = 0; i < domain.length; i++) {
            html +=
                  '<li data-cc="'+scale(domain[i] + 1)+'" data-low="'+domain[i]+'" data-high="'+(domain[i + 1] ?  domain[i + 1] : domain[i]+ 20000)+'"> <span class="square" style="background:'+scale(domain[i] + 1)+'"></span><span>' +
                  labels[i] + (labels[i + 1] ? ' &ndash; ' + labels[i + 1] + '</span></li>' : '+</span></li>');
          }
          html += "</ul>";

          div.innerHTML = html;

          return div;
      };

      return legend;
  }


//***************************
// updater
//***************************
  var updater = {
    store: [],
    subset: [],
    start: function(set) {
      if(set) {
        _.each(set.features, function(f){
          delete f.properties.TRACTCE;
          delete f.properties.id;
          delete f.properties.name;

          updater.store.push(f.properties);

        });
        console.log("*** tile store is ready *****");
      } else {
        console.error("*** no initial set provided to updater ***");
      }
    },
    cut: function(low, high, indicator) {
      if(this.store.length) {
        updater.subset = [];
          _.each(updater.store, function(f) {
            //vectorGrid.resetFeatureStyle(f.id);
              // count only datapoints with income data
              if((f[indicator] >= low && f[indicator] <= high) && f.mhi) {
                vectorGrid.resetFeatureStyle(f.geo_id);
                updater.subset.push(f);
              } else {
                vectorGrid.setFeatureStyle(f.geo_id, { color: 'steelblue', weight: 0 });
              }
          });

      } else {
        console.error("Unable to access tile store");
      }
    },
    reset: function () {
      if(this.store.length) {
        _.each(updater.store, function(f) {
          vectorGrid.resetFeatureStyle(f.geo_id);
        });
      } else {
        console.error("Unable to access tile store");
      }
    }
  };

  updater.start(data);

//***************************
// charts
//***************************
  var charts = {};

  charts.histogram = {
    x_domain: [],
    svg: "",
    config: {
      w: 300,
      h: 300,
      margin: {
          top: 20,
          right: 45,
          bottom: 60,
          left: 20
        }
    },
    fn: {
      tooltip: d3.select('#tooltip'),
      mouseenter: function(d) {
        var format = d3.format(",d");
        var text = d.length + " block groups ";
            text += "between $" + format(d.x0) + " and $" + format(d.x1);

        this.tooltip
          .html(text)
          .style('display', 'block')
          .style('width', '200px');
      },
      mousemove: function() {
        this.tooltip
          .style("left", (d3.event.pageX - 240) + 'px')
          .style("top", (d3.event.pageY + -40) + 'px');
      },
      mouseout: function() {
        this.tooltip.style('display', 'none');
      }
    },
    init: function(el, data) {
      console.log("******* init histrogram ********");

      var that = this;
      this.config.width = this.config.w - this.config.margin.left - this.config.margin.right,
      this.config.height = this.config.h - this.config.margin.top - this.config.margin.bottom;

      this.x = d3.scaleLinear()
        .domain([0, d3.max(data, function(d){ return d.mhi; })])
        .range([that.config.margin.left, this.config.width - this.config.margin.right]).nice(14);

      this.bins = d3.histogram()
        .domain(this.x.domain())
        .thresholds(this.x.ticks(14))
        (_.pluck(data, "mhi"));

      this.y = d3.scaleLinear()
        .domain([0, d3.max(this.bins, function(d) {
          return d.length;
        })])
        .range([this.config.height - this.config.margin.bottom, 0]);

      this.colorCode = scale(dataset, "mhi");

      this.svg = d3.select(el).select(".viz").append("svg")
        .attr("preserveAspectRatio", "xMinYMin meet")
        .attr("viewBox", "8 0 " + this.config.width + " " + this.config.height)
        .append("g")
        .attr("transform", "translate(" + that.config.margin.left + "," + that.config.margin.top + ")");

      this.svg.append("g")
        .attr("class", "x axis")
        .attr("transform", "translate(0," + (that.config.height - that.config.margin.bottom) + ")")
        .call(d3.axisBottom(this.x)
          .ticks(10)
          .tickFormat(d3.format("$,"))
        ).selectAll("text")
        .style("text-anchor", "end")
        .attr("dx", "-1.2em")
        .attr("dy", "-0.7em")
        .attr("transform", "rotate(-90)");

      this.svg.append("g")
        .attr("class", "y axis")
        .attr("transform", "translate(" + (that.config.margin.left) + ", 0)")
        .call(d3.axisLeft(this.y)
          //.ticks(10)
        );

      var bar = this.svg.selectAll(".bar")
        .data(this.bins)
        .enter().append("g")
        .attr("class", "bar")
        .attr("transform", function(d) {
          return "translate(" + that.x(d.x0) + "," + (that.y(d.length)) + ")";
        });

      bar.append("rect")
        .attr("x", 1)
        .attr("width", that.x(that.bins[0].x1) - that.x(that.bins[0].x0))
        .attr("height", function(d) {
          return that.config.height - that.config.margin.bottom - that.y(d.length);
        })
        .style("fill", function(d) {return that.colorCode(d.x0);})
        .style({
          "shape-rendering": "crispEdges"
        });

      bar.selectAll("rect").on('mouseover', function(d) {
        that.fn.mouseenter(d);
      }).on('mouseout', function() {
        that.fn.mouseout();
      }).on('mousemove', function() {
        that.fn.mousemove();
      });


    },
    update: function(el, data) {
      // console.log("******* update histrogram ********", data.length);

      var that = this;

      if( data.length ) {
        this.x = d3.scaleLinear()
          .domain([0, d3.max(data, function(d){ return d.mhi; })])
          .range([that.config.margin.left, this.config.width - this.config.margin.right]).nice(14);

        this.bins = d3.histogram()
          .domain(this.x.domain())
          .thresholds([0, 20000, 40000, 60000, 80000, 100000, 120000, 140000, 160000, 180000,200000,220000,240000, 260000]) //this.x.ticks(14)
          (_.pluck(data, "mhi"));

        this.y = d3.scaleLinear()
          .domain([0, d3.max(this.bins, function(d) {
            return d.length;
          })])
          .range([(this.config.height - this.config.margin.bottom), 0]).nice(16);

        $(el).find(".viz").show();
        $(el).find("h5").hide();

        this.svg = d3.select(el).select(".viz").select("svg").select("g");

        this.svg.select(".x.axis")
          .transition().duration(600)
          .attr("transform", "translate(0," + (that.config.height - that.config.margin.bottom) + ")")
          .call(d3.axisBottom(this.x)
            .ticks(10)
            .tickFormat(d3.format("$,"))
          ).selectAll("text")
          .style("text-anchor", "end")
          .attr("dx", "-1.2em")
          .attr("dy", "-0.7em")
          .attr("transform", "rotate(-90)");

        this.svg.select(".y.axis")
          .transition().duration(600)
          .attr("transform", "translate(" + (that.config.margin.left) + ", 0)")
          .call(d3.axisLeft(this.y)
            //.tickFormat(d3.format(",d"))
            .ticks(this.y.domain()[1] >= 10 ? 10 : 2)
          );

        var bars = this.svg.selectAll(".bar").data(this.bins);

        var group = bars.enter()
          .append("g")
          .attr("class", "bar")
          .attr("transform", function(d) {
            return "translate(" + that.x(d.x0) + "," + (that.y(d.length)) + ")";
          });

        group.append("rect")
          .attr("x", 1)
          .attr("y", 0)
          .attr("width", that.colorCode.domain().length)
          .attr("height", function(d) {
            return that.config.height - that.config.margin.bottom - that.y(d.length);
          })
          .style("fill", function(d) { return that.colorCode(d.x0); });

        bars
          .transition()
          .duration(800)
          .delay(function(d,i){ return i*50})//a different delay for each bar
          .attr("transform", function(d) {
              return "translate(" + that.x(d.x0) + "," +(that.y(d.length))+ ")";
           })
          .select("rect")
          .attr("y", 0)
          .attr("width", that.colorCode.domain().length)
          .attr("height", function(d) {
            return that.config.height - that.config.margin.bottom - that.y(d.length);
          })
          .style("fill", function(d) { return that.colorCode(d.x0); })

        bars.exit()
          .transition()
          .duration(200)
          .attr("width", 0)
          .remove();

      } else {
        $(el)
          .find(".viz").hide()
        $(el).find("h5")
          .empty()
          .append("0 block groups for selection!")
          .show();
      }

    }
  };


//***************************
// COMPONENTS
//***************************

  Vue.directive('chart-init', {
        bind: function(el, binding, vnode) {
          var that = this;
          var chartType = binding.value.type

          if(chartType == "distribution") {
            charts.histogram.init(el, updater.store);
          }

        }
  });


  Vue.component("chart", {
    template: "<div :id='id'><h3>{{titled}}</h3><div class='viz'></div><h5 class='error'></h5></div>",
    props: ["id", "titled"]
  });



//***************************
// FILTERS
//***************************

  var indicators = Vue.component("indicators", {
    template: '<div id="indicators"><select class="chosen-select indicator" v-model="indLayer"> <template v-for="g in indLayers"> <optgroup v-bind:label="g.name"><option v-for="layer in g.vals" v-bind:value="layer.val" v-text="layer.label" v-bind:data-slide="layer.slide"></option></optgroup></template></select></div>',
    props: ["default"],
    data: function() {
      return {
        indLayer: "",
        indLayers: [{name: "Population",
          vals: [{label:"All People", val: "pop_t", slide: "true"},
                 {label:"Female", val: "pop_s_f", slide: "true"},
                 {label:"Male", val: "pop_s_m", slide: "true"}]
               }]
      }
    }
  });

  var baseIndicators = Vue.component("base-indicators", {
    template: '<select class="chosen-select base" v-model="baseLayer"><option v-for="layer in baseLayers" v-bind:value="layer.val" v-text="layer.label"></option></select>',
    props: ["default"],
    data: function() {
      return {
        baseLayer: "",
        baseLayers: [{label:"Median Household Income", val: "income"}]
      }
    }
  });

  var slider = Vue.component("slider", {
    template: '<div id="circles-slider"></div>',
    data: function() {
      return {
        value: ""
      }
    }
  });



//***************************
// UI
//***************************
  var nav = new Vue({
    el: "#filters",
    components: {
      "base-indicators": baseIndicators,
      "indicators": indicators,
      "slider": slider
    },
    data: {},
    mounted: function() {
      var that = this;

      $(".chosen-select").chosen({
        //width: "100%",
        disable_search: true,
        inherit_select_classes: false
      });

     $("#circles-slider")
        .slider({
          range: true,
          values:[0,50]
        })
        .slider("pips").slider("float", {
          formatLabel: function(val) {
              return val.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");;
          }
        });
    },
    methods: {
      reset: function() {
        updater.reset();
        map.removeLayer(vectorGrid);
        $(".legend").remove();

      //defaults
        $(".base").val("income").change().trigger("chosen:updated");
        $(".indicator").val("pop_t").change().trigger("chosen:updated");
      }
    }
  });

  var stats = new Vue({
      el: "#stats",

      data: {
        subset: updater.subset,
        selectedIndicator: "",
        selectedBase: "",
        lowerBound: 0,
        higherBound: 0,
        isCount: true,
        // suffix: "",
        indLayer: "",
        baseLayer: "",
        boroughs: []
      },
      mounted: function() {
        var that = this;

      // attach filters behaviour
        $("#circles-slider").on("slidechange", function(e,ui) {
          // console.log("****** slidechange *******");
          // console.log("****** reset base layer *******");
          $(".legend li.all").trigger("click");

          // console.log("slider values " ,ui.values, that.indLayer);
          that.lowerBound = ui.values[0];
          that.higherBound = ui.values[1];
          // updater.reset();
          updater.cut(ui.values[0], ui.values[1], that.indLayer ); // create the subset
          // console.log("****** update data *******");
          that.subset = updater.subset; // save the subset to data
          // this update applies to both slide and no slide cases
          // first check if element is rendered
          charts.histogram.update("#distribution", that.subset);

          that.boroughs = _.countBy(that.subset, "cnty");
        });

      $(".base").change(function(e){
        that.baseLayer = e.currentTarget.value;
        that.selectedBase = $(this).find("option:selected").text();

        $(this).trigger('chosen:updated');

        updater.reset();
        vectorGrid.addTo(map);

        var cc = scale(data, "mhi");
        var legend = createLegend(cc);
        legend.addTo(map);

        $(".legend li").on("click", function(e) {
          e.stopPropagation();

          var $this = $(this);
          var $all = $(".legend li");

          if($this.hasClass("all")) {

            $all.each(function(v){
              $(this).find(".square").css("backgroundColor", $(this).data("cc"));
            });

            updater.cut($this.data("low"), $this.data("high"), "mhi"); // create the subset
            // console.log("****** update data *******");
            that.subset = updater.subset; // save the subset to data
            charts.histogram.update("#distribution", that.subset);
            that.boroughs = _.countBy(that.subset, "cnty");

          } else {

            // reset slider
            var options = $("#circles-slider").slider("option");
            $("#circles-slider").slider( 'values', [ options.min, options.max ] );

            $all.find(".square").css("backgroundColor", "#fff");
            $this.find(".square").css("backgroundColor", $this.data("cc"));

            updater.cut($this.data("low"), $this.data("high"), "mhi"); // create the subset
            console.log("****** update data *******");
            that.subset = updater.subset; // save the subset to data
            charts.histogram.update("#distribution", that.subset);
            that.boroughs = _.countBy(that.subset, "cnty");

          }

        });

      });

      $(".indicator").change(function(e){
        that.indLayer = e.currentTarget.value;
        that.selectedIndicator = $(this).find("option:selected").text();

        $(this).trigger('chosen:updated');

        if($(this).find("option:selected").data("slide") == true) {
          console.log("****** trigger slider *******");

          if( that.indLayer == "pop_t" ) {
            that.isCount = true;

            var maxBound = _.max(_.pluck(updater.store, 'pop_t'));

              $("#circles-slider")
                .slider("option", {
                  step: 100,
                  min: 0,
                  max: maxBound,
                  values: [0, maxBound],
                  range: true
                })
                .slider("pips", {
                  rest: false,
                  labels: { "first": "0", "last": maxBound },
                  formatLabel: function(val) {
                    return val.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");;
                  }
              }, "refresh").slider("float", "refresh");

           } else {
            that.isCount = false;

              $("#circles-slider")
                .slider("option", {
                  step: 1,
                  min: 0,
                  max: 100,
                  range: true,
                  values: [50, 100]
                })
                .slider("pips", {
                  rest: false,
                  labels: { "first": "0%", "last": "100%" },
                  step: 10,
                  formatLabel: function(val) {
                    return val.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");;
                  }
                  //suffix: "%"
              }, "refresh")
              .slider("float", "refresh");
          }

            // show slider
            $("#circles-slider").show();

        } else {
          // no slider - currently not in use and it will error
          $("#circles-slider").slideUp();
          that.subset = updater.subset; // save the subset to data
          charts.histogram.update("#distribution", that.subset);
        }

      });

      //defaults
        $(".base").val("income").change().trigger("chosen:updated");
        $(".indicator").val("pop_t").change().trigger("chosen:updated");
        $("#results").show();

      },
    watch: {
      subset: function(oldVal, newVal) {
        console.log("watch", newVal.length)
        $("#results").css("borderColor", "#098").stop().animate({
          "borderColor": "#222"
        }, 700);
      },
      indLayer: function(oldVal, newVal) {
        console.log("watch", newVal)
      }
    },
    filters: {
      lowercase: function(field) {
        return field.toLowerCase();
      },
      formatNumber: function(field) {
        return field.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
      },
      percent: function(field) {
        return ((field / updater.store.length) * 100).toFixed(1) + "%"
      }
    },
      methods: {

      }
    });


});
