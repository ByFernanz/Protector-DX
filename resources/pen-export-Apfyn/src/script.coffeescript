sketch = Sketch.create()
sketch.mouse.x = sketch.width / 10
sketch.mouse.y = sketch.height
mountainRanges = []
dt = 1

#
# MOUNTAINS
#
  
Mountain = ( config ) ->
  this.reset( config )

Mountain.prototype.reset = (config) ->
  this.layer = config.layer
  this.x = config.x
  this.y = config.y
  this.width = config.width
  this.height = config.height
  this.color = config.color  

#
# MOUNTAIN RANGE
#

MountainRange = (config) -> 
  this.x = 0
  this.mountains = []
  this.layer = config.layer
  this.width =
    min: config.width.min
    max: config.width.max
  this.height =
    min: config.height.min
    max: config.height.max
  this.speed = config.speed
  this.color = config.color
  this.populate()
  return this
  
MountainRange.prototype.populate = ->
  totalWidth = 0
  while totalWidth <= sketch.width + ( this.width.max * 4 )
    newWidth = round ( random( this.width.min, this.width.max ) )
    newHeight = round ( random( this.height.min, this.height.max ) )
    this.mountains.push( new Mountain(
      layer: this.layer
      x: if this.mountains.length == 0 then 0 else ( this.mountains[ this.mountains.length - 1 ].x + this.mountains[ this.mountains.length - 1 ].width )
      y: sketch.height - newHeight
      width: newWidth
      height: newHeight
      color: this.color
    ) )
    totalWidth += newWidth

MountainRange.prototype.update = ->
  this.x -= ( sketch.mouse.x * this.speed ) * dt
      
  firstMountain = this.mountains[ 0 ]
  if firstMountain.width + firstMountain.x + this.x < -this.width.max
    newWidth = round ( random( this.width.min, this.width.max ) )
    newHeight = round ( random( this.height.min, this.height.max ) )
    lastMountain = this.mountains[ this.mountains.length - 1 ]    
    firstMountain.reset(
      layer: this.layer
      x: lastMountain.x + lastMountain.width
      y: sketch.height - newHeight
      width: newWidth
      height: newHeight
      color: this.color
    )    
    this.mountains.push( this.mountains.shift() )
  
MountainRange.prototype.render = ->
  sketch.save()
  sketch.translate( this.x, ( sketch.height - sketch.mouse.y ) / 20 * this.layer )     
  sketch.beginPath()
  pointCount = this.mountains.length
  sketch.moveTo(this.mountains[0].x, this.mountains[0].y)  
  for i in [0..(pointCount-2)] by 1
    c = (this.mountains[i].x + this.mountains[i + 1].x) / 2
    d = (this.mountains[i].y + this.mountains[i + 1].y) / 2
    sketch.quadraticCurveTo(this.mountains[i].x, this.mountains[i].y, c, d)
  sketch.lineTo(sketch.width - this.x, sketch.height)
  sketch.lineTo(0 - this.x, sketch.height)  
  sketch.closePath()
  sketch.fillStyle = this.color
  sketch.fill()    
  sketch.restore()

#
# SETUP
#
  
sketch.setup = ->    
  i = 5
  while i--
    mountainRanges.push( new MountainRange(
      layer: i + 1
      width:
        min: ( i + 1 ) * 50
        max: ( i + 1 ) * 70
      height:
        min: 200 - ( ( i ) * 40 )
        max: 300 - ( ( i ) * 40 )
      speed: ( i + 1 ) * .003
      color: 'hsl( 120, ' + ( ( ( i + 1 ) * 1 ) + 10 ) + '%, ' + ( 75 - ( i * 13 ) ) + '% )'
    ) )
    
#
# CLEAR
#
  
sketch.clear = ->
  sketch.clearRect( 0, 0, sketch.width, sketch.height )

#
# UPDATE
#
  
sketch.update = ->
  dt = if sketch.dt < .1 then .1 else sketch.dt / 16
  dt = if dt > 5 then 5 else dt
  i = mountainRanges.length
  mountainRanges[ i ].update( i ) while i--
  
#
# DRAW
#
  
sketch.draw = ->
  i = mountainRanges.length
  mountainRanges[ i ].render( i ) while i--

#
# Mousemove Fix
#  
    
$( window ).on 'mousemove', (e) ->
  sketch.mouse.x = e.pageX
  sketch.mouse.y = e.pageY